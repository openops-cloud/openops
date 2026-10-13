import { isEditableElement, NO_KEY_CLASS_NAME } from './editable-element-utils';

describe('isEditableElement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it.each(['input', 'textarea', 'select'])(
    'returns true for a <%s> element',
    (tag) => {
      const element = document.createElement(tag);
      document.body.appendChild(element);

      expect(isEditableElement(element)).toBe(true);
    },
  );

  it('returns true for a contenteditable element', () => {
    const element = document.createElement('div');
    element.setAttribute('contenteditable', 'true');
    document.body.appendChild(element);

    expect(isEditableElement(element)).toBe(true);
  });

  it('returns true for a Monaco EditContext input nested inside a nokey container', () => {
    document.body.innerHTML = `<div class="${NO_KEY_CLASS_NAME}"><div class="monaco-editor"><div class="native-edit-context" tabindex="0"></div></div></div>`;

    expect(
      isEditableElement(document.querySelector('.native-edit-context')),
    ).toBe(true);
  });

  it('returns false for a plain div outside a nokey container', () => {
    document.body.innerHTML =
      '<div class="native-edit-context" tabindex="0"></div>';

    expect(
      isEditableElement(document.querySelector('.native-edit-context')),
    ).toBe(false);
  });

  it('returns false for null, undefined and document.body', () => {
    expect(isEditableElement(null)).toBe(false);
    expect(isEditableElement(undefined)).toBe(false);
    expect(isEditableElement(document.body)).toBe(false);
  });
});
