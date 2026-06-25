import { FlowVersionUndoRedoHistoryItem } from '@/app/features/builder/flow-version-undo-redo/types';
import { FlowVersion } from '@openops/shared';

type UndoRedoStack = {
  clear: () => void;
  push: (item: FlowVersionUndoRedoHistoryItem) => void;
};

/** @deprecated Use useFlowVersionUndoRedo().addToUndoHistory instead. */
export const pushFlowVersionToVersionHistory = (
  currentState: {
    flowVersion: { id: string; trigger: FlowVersion['trigger'] };
    undoFlowVersionHistory: UndoRedoStack;
    redoFlowVersionHistory: UndoRedoStack;
  },
  spotlightStepName?: string,
) => {
  const { flowVersion, undoFlowVersionHistory, redoFlowVersionHistory } =
    currentState;
  if (!spotlightStepName) {
    return;
  }

  redoFlowVersionHistory.clear();

  undoFlowVersionHistory.push({
    snapshot: flowVersion.trigger,
    spotlightStepName,
    id: flowVersion.id,
  });
};
