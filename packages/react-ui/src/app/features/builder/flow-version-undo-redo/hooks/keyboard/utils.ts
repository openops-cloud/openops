function isModifierKey(key: string): key is keyof KeyboardEvent {
  return key in document.createEvent('KeyboardEvent');
}

const isKeyCombinationPressed = (
  e: KeyboardEvent,
  keyCombination: {
    key: string;
    modifiers: string[];
    shortCircuitModifiers?: string[];
  },
) => {
  const isKeyModifierPressed = (modifier: string) =>
    isModifierKey(modifier) && e[modifier];

  if (keyCombination.shortCircuitModifiers?.some(isKeyModifierPressed)) {
    return false;
  }

  return (
    keyCombination.modifiers.every(isKeyModifierPressed) &&
    e.key.toLowerCase() === keyCombination.key.toLowerCase()
  );
};

export { isKeyCombinationPressed };
