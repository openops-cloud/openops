import { useKeyboardShortcut } from '../../hooks/use-keyboard-shortcut';
import {
  FlowVersionUndoRedo,
  useFlowVersionUndoRedo,
} from './flow-version-undo-redo';

const operationKeyboardKeyCombinationMap = {
  undo: [
    { key: 'z', modifiers: ['ctrlKey'], shortCircuitModifiers: ['shiftKey'] },
    { key: 'z', modifiers: ['metaKey'], shortCircuitModifiers: ['shiftKey'] },
  ],
  redo: [
    { key: 'z', modifiers: ['metaKey', 'shiftKey'] },
    { key: 'z', modifiers: ['ctrlKey', 'shiftKey'] },
    { key: 'y', modifiers: ['ctrlKey'] },
  ],
};

type OperationName = 'undo' | 'redo';

const operationToCapabilityMap: Record<
  OperationName,
  keyof Pick<FlowVersionUndoRedo, 'canRedo' | 'canUndo'>
> = {
  undo: 'canUndo',
  redo: 'canRedo',
};

const useKeyboardHistoryShortcuts = (operationName: 'undo' | 'redo') => {
  const flowVersionUndoRedo = useFlowVersionUndoRedo();
  const operationMap = {
    undo: flowVersionUndoRedo.undo,
    redo: flowVersionUndoRedo.redo,
  };

  const canPerformOperation = () =>
    flowVersionUndoRedo[operationToCapabilityMap[operationName]];

  useKeyboardShortcut({
    operationName: operationName,
    operationMap,
    keyCombinationMap: operationKeyboardKeyCombinationMap,
    canPerformOperation,
  });
};

const useKeyboardFlowVersionUndoRedo = () => {
  useKeyboardHistoryShortcuts('undo');
  useKeyboardHistoryShortcuts('redo');
};

export { useKeyboardFlowVersionUndoRedo, useKeyboardHistoryShortcuts };
