import { useEffect, useMemo } from 'react';

export type KeyCombination = {
  key: string;
  modifiers: string[];
  shortCircuitModifiers?: string[];
};

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

const CONTAINER_ID = 'flow-canvas-container';

export function useKeyboardShortcut<T extends string>(params: {
  operationName: T;
  // Mapping from operation names to functions
  operationMap: Record<T, () => void>;
  // Mapping from operation names to their key combinations
  keyCombinationMap: Record<T, KeyCombination[]>;
  // Function that returns whether the operation can be performed
  canPerformOperation: (operationName: T) => boolean;
}) {
  const {
    operationName,
    operationMap,
    keyCombinationMap,
    canPerformOperation,
  } = params;

  // Memoize the key combinations for this operation.
  const combinations = useMemo(
    () => keyCombinationMap[operationName],
    [operationName, keyCombinationMap],
  );

  useEffect(() => {
    const handleOperation = (e: KeyboardEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target !== document.body && !target.closest(`#${CONTAINER_ID}`)) {
        return;
      }

      if (!canPerformOperation(operationName)) {
        return;
      }

      if (
        combinations.every(
          (combination) => !isKeyCombinationPressed(e, combination),
        )
      ) {
        return;
      }

      e.preventDefault();
      operationMap[operationName]();
    };

    window.addEventListener('keydown', handleOperation);
    return () => window.removeEventListener('keydown', handleOperation);
  }, [combinations, operationMap, operationName, canPerformOperation]);
}
