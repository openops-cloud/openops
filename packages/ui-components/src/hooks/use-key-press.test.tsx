import { act, renderHook, screen } from '@testing-library/react';
import { useKeyPress } from './use-key-press';

const SPACE = 'Space';

const EDITOR_INPUT_TEST_ID = 'editor-input';

const mountEditorLikeDom = (wrapperClass: string): HTMLElement => {
  document.body.innerHTML = `<div class="${wrapperClass}"><div class="monaco-editor"><div class="native-edit-context" tabindex="0" data-testid="${EDITOR_INPUT_TEST_ID}"></div></div></div>`;
  return screen.getByTestId(EDITOR_INPUT_TEST_ID);
};

const pressSpace = (target: HTMLElement): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    code: SPACE,
    key: ' ',
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
};

describe('useKeyPress', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('ignores Space when the event target is inside a nokey container', () => {
    const target = mountEditorLikeDom('nokey');
    const { result } = renderHook(() => useKeyPress(SPACE));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const event = pressSpace(target);

    expect(event.defaultPrevented).toBe(false);
    expect(result.current).toBe(false);
  });

  it('prevents default and reports Space pressed when the target is a plain element', () => {
    const target = mountEditorLikeDom('not-nokey');
    const { result } = renderHook(() => useKeyPress(SPACE));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const event = pressSpace(target);

    expect(event.defaultPrevented).toBe(true);
    expect(result.current).toBe(true);
  });
});
