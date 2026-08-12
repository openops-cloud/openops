import localforage from 'localforage';
import { PointerName, UndoRedoStackName } from '../enums';
import {
  FlowVersionUndoRedoHistoryItem,
  MoveActionType,
  UndoRedoMetaData,
} from '../types';

// Utility function to create keys for localforage
const createKey = (
  stackName: UndoRedoStackName,
  itemId: string,
  pointer: number,
): string => {
  return `${stackName}-${itemId}-${pointer}`;
};

const processMoveAction = async (
  moveAction: MoveActionType,
  metadata: UndoRedoMetaData,
  lastHistoryItem: FlowVersionUndoRedoHistoryItem,
  flowId: string,
): Promise<{
  metadata: UndoRedoMetaData;
  lastHistoryItem: FlowVersionUndoRedoHistoryItem;
}> => {
  let fromTopKey: PointerName;
  let fromBottomKey: PointerName;
  let toTopKey: PointerName;

  // Determine the source and destination stack pointers based on the action
  if (moveAction.from === UndoRedoStackName.UNDO) {
    fromTopKey = PointerName.UNDO_TOP; // Source stack top pointer
    fromBottomKey = PointerName.UNDO_BOTTOM; // Source stack bottom pointer
    toTopKey = PointerName.REDO_TOP; // Destination stack top pointer
  } else {
    fromTopKey = PointerName.REDO_TOP; // Source stack top pointer
    fromBottomKey = PointerName.REDO_BOTTOM; // Source stack bottom pointer
    toTopKey = PointerName.UNDO_TOP; // Destination stack top pointer
  }

  // Skip if the source stack is empty (top pointer equals bottom pointer)
  if (metadata[fromTopKey] === metadata[fromBottomKey]) {
    return { metadata, lastHistoryItem };
  }

  // Retrieve the operation from the source stack's top
  const operationKey = createKey(moveAction.from, flowId, metadata[fromTopKey]);
  const operation =
    await localforage.getItem<FlowVersionUndoRedoHistoryItem>(operationKey);

  if (operation) {
    // Remove the operation from the source stack's top
    await localforage.removeItem(operationKey);

    // Move the source stack's top pointer down (decrement by 1)
    metadata[fromTopKey]--;

    // Move the destination stack's top pointer up (increment by 1)
    metadata[toTopKey]++;

    // Update the lastHistoryItem with the retrieved operation's spotlight step name
    lastHistoryItem = {
      ...lastHistoryItem,
      spotlightStepName: operation?.spotlightStepName ?? '',
    };

    // Add the updated history item to the destination stack's top
    const destinationKey = createKey(moveAction.to, flowId, metadata[toTopKey]);
    await localforage.setItem(destinationKey, lastHistoryItem);

    // Update the snapshot in the lastHistoryItem with the operation's snapshot
    lastHistoryItem = {
      ...lastHistoryItem,
      snapshot: operation?.snapshot ?? {},
    };
  }

  return { metadata, lastHistoryItem };
};

export { createKey, processMoveAction };
