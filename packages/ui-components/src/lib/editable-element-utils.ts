/**
 * Class name honoured by @xyflow/system's `isInputDOMNode`: key events whose
 * target lives inside an element with this class are ignored by the flow
 * canvas keyboard listeners (Space to pan, Shift to select, copy shortcut...).
 */
export const NO_KEY_CLASS_NAME = 'nokey';

const EDITABLE_TAG_NAMES = ['INPUT', 'SELECT', 'TEXTAREA'];

/**
 * Mirrors `isInputDOMNode` from @xyflow/system but takes an element instead of
 * an event, so it can be used with `document.activeElement`.
 *
 * Needed because editors such as Monaco (EditContext API) take keyboard input
 * through a plain `div` that is neither a form control nor `contenteditable`.
 */
export function isEditableElement(
  element: Element | null | undefined,
): boolean {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  return (
    EDITABLE_TAG_NAMES.includes(element.nodeName) ||
    element.hasAttribute('contenteditable') ||
    !!element.closest(`.${NO_KEY_CLASS_NAME}`)
  );
}
