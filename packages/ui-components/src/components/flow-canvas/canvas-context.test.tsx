import { FlowVersion } from '@openops/shared';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { useKeyPress } from '@xyflow/react';
import React from 'react';
import { InteractiveContextProvider, useCanvasContext } from './canvas-context';
import { SHIFT_KEY, SPACE_KEY } from './constants';

// Mock the useKeyPress hook
jest.mock('@xyflow/react', () => ({
  useKeyPress: jest.fn(),
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

jest.mock('lodash-es', () => ({
  cloneDeep: jest.fn(),
}));

jest.mock('./clipboard-context', () => ({
  useClipboardContext: () => ({
    actionToPaste: jest.fn(),
    fetchClipboardOperations: () => jest.fn(),
  }),
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
});
