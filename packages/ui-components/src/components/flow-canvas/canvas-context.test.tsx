import { FlowVersion } from '@openops/shared';
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { useKeyPress } from '../../hooks/use-key-press';
import { InteractiveContextProvider, useCanvasContext } from './canvas-context';
import { SHIFT_KEY, SPACE_KEY } from './constants';
import { copyPasteToast } from './copy-paste-toast';

jest.mock('../../hooks/use-key-press', () => ({
  useKeyPress: jest.fn(),
}));

jest.mock('@xyflow/react', () => ({
  useStoreApi: jest.fn(() => ({
    getState: jest.fn().mockReturnValue({
      setNodes: jest.fn(),
      setEdges: jest.fn(),
      nodes: [
        {
          id: 'step_1',
          selected: true,
        },
      ],
    }),
  })),
}));

jest.mock('./copy-paste-toast', () => ({
  copyPasteToast: jest.fn(),
}));

jest.mock('lodash-es', () => ({
  cloneDeep: jest.fn(),
}));

const mockFlowVersion = {} as FlowVersion;

// Test component to consume the context
const TestComponent = () => {
  const { panningMode } = useCanvasContext();
  return <div data-testid="panning-mode">{panningMode}</div>;
};

describe('InteractiveContextProvider', () => {
  const useKeyPressMock = useKeyPress as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should default to "grab" panning mode when no keys are pressed', () => {
    useKeyPressMock.mockReturnValue(false); // Neither space nor shift pressed

    const { getByTestId } = render(
      <InteractiveContextProvider
        selectedStep={'step_1'}
        clearSelectedStep={() => {}}
        flowVersion={mockFlowVersion}
      >
        <TestComponent />
      </InteractiveContextProvider>,
    );

    expect(getByTestId('panning-mode')).toHaveTextContent('grab');
  });

  it('should set panning mode to "grab" when space is pressed and shift is not', () => {
    useKeyPressMock.mockImplementation((key: string) => key === SPACE_KEY);

    const { getByTestId } = render(
      <InteractiveContextProvider
        selectedStep={'step_1'}
        clearSelectedStep={() => {}}
        flowVersion={mockFlowVersion}
      >
        <TestComponent />
      </InteractiveContextProvider>,
    );

    expect(getByTestId('panning-mode')).toHaveTextContent('grab');
  });

  it('should set panning mode to "pan" when shift is pressed and space is not', () => {
    useKeyPressMock.mockImplementation((key: string) => key === SHIFT_KEY);

    const { getByTestId } = render(
      <InteractiveContextProvider
        selectedStep={'step_1'}
        clearSelectedStep={() => {}}
        flowVersion={mockFlowVersion}
      >
        <TestComponent />
      </InteractiveContextProvider>,
    );

    expect(getByTestId('panning-mode')).toHaveTextContent('pan');
  });

  it('should return "grab" when both space and shift keys are pressed', () => {
    useKeyPressMock.mockReturnValue(true); // Simulate both keys pressed

    const { getByTestId } = render(
      <InteractiveContextProvider
        selectedStep={'step_1'}
        clearSelectedStep={() => {}}
        flowVersion={mockFlowVersion}
      >
        <TestComponent />
      </InteractiveContextProvider>,
    );

    expect(getByTestId('panning-mode')).toHaveTextContent('grab');
  });

  it('should correctly update panningMode when setPanningMode is called', () => {
    useKeyPressMock.mockReturnValue(false); // Neither space nor shift pressed

    const ComponentWithSetter = () => {
      const { panningMode, setPanningMode } = useCanvasContext();

      React.useEffect(() => {
        setPanningMode('pan');
      }, [setPanningMode]);

      return <div data-testid="panning-mode">{panningMode}</div>;
    };

    const { getByTestId } = render(
      <InteractiveContextProvider
        selectedStep={'step_1'}
        clearSelectedStep={() => {}}
        flowVersion={mockFlowVersion}
      >
        <ComponentWithSetter />
      </InteractiveContextProvider>,
    );

    expect(getByTestId('panning-mode')).toHaveTextContent('pan');
  });

  it('should return "pan" when shift is pressed even if panningMode state is "grab"', () => {
    useKeyPressMock.mockImplementation((key: string) => key === SHIFT_KEY);

    const { getByTestId } = render(
      <InteractiveContextProvider
        selectedStep={'step_1'}
        clearSelectedStep={() => {}}
        flowVersion={mockFlowVersion}
      >
        <TestComponent />
      </InteractiveContextProvider>,
    );

    expect(getByTestId('panning-mode')).toHaveTextContent('pan');
  });

  it('should return "grab" when space is pressed even if panningMode state is "pan"', () => {
    useKeyPressMock.mockImplementation((key: string) => key === SPACE_KEY);

    const { getByTestId } = render(
      <InteractiveContextProvider
        selectedStep={'step_1'}
        clearSelectedStep={() => {}}
        flowVersion={mockFlowVersion}
      >
        <TestComponent />
      </InteractiveContextProvider>,
    );

    expect(getByTestId('panning-mode')).toHaveTextContent('grab');
  });

  describe('paste handling', () => {
    const dispatchPaste = (text: string) => {
      const event = new Event('paste', {
        bubbles: true,
        cancelable: true,
      }) as ClipboardEvent;
      Object.defineProperty(event, 'clipboardData', {
        value: { getData: () => text },
      });
      act(() => {
        document.dispatchEvent(event);
      });
    };

    const mountProviderWithPasteSpy = () => {
      const onPaste = jest.fn();
      useKeyPressMock.mockReturnValue(false);
      render(
        <InteractiveContextProvider
          selectedStep={null}
          clearSelectedStep={() => {}}
          flowVersion={mockFlowVersion}
          onPaste={onPaste}
        >
          <TestComponent />
        </InteractiveContextProvider>,
      );
      return onPaste;
    };

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('ignores paste when focus is inside a nokey container such as the Monaco editor', () => {
      document.body.innerHTML =
        '<div class="nokey"><div class="native-edit-context" tabindex="0" data-testid="editor-input"></div></div>';
      screen.getByTestId('editor-input').focus();
      const onPaste = mountProviderWithPasteSpy();

      dispatchPaste('plain text with spaces');

      expect(onPaste).not.toHaveBeenCalled();
      expect(copyPasteToast).not.toHaveBeenCalled();
    });

    it('ignores paste when focus is inside a textarea', () => {
      document.body.innerHTML = '<textarea></textarea>';
      screen.getByRole('textbox').focus();
      const onPaste = mountProviderWithPasteSpy();

      dispatchPaste('plain text');

      expect(onPaste).not.toHaveBeenCalled();
      expect(copyPasteToast).not.toHaveBeenCalled();
    });

    it('shows the error toast when non-JSON text is pasted with focus on the body', () => {
      const onPaste = mountProviderWithPasteSpy();

      dispatchPaste('plain text');

      expect(onPaste).not.toHaveBeenCalled();
      expect(copyPasteToast).toHaveBeenCalledWith({
        success: false,
        isCopy: false,
      });
    });

    it('calls onPaste with the parsed action when step JSON is pasted on the canvas', () => {
      const onPaste = mountProviderWithPasteSpy();

      dispatchPaste(JSON.stringify({ name: 'step_1', settings: {} }));

      expect(onPaste).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'step_1' }),
      );
    });
  });
});
