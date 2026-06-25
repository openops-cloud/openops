import {
  UndoHistoryRelevantFlowOperationRequest,
  useBuilderStateContext,
} from '@/app/features/builder/builder-hooks';
import { useFlowVersionUndoRedo } from '@/app/features/builder/flow-version-undo-redo/hooks/flow-version-undo-redo';
import { toast, UNSAVED_CHANGES_TOAST } from '@openops/components/ui';
import { FlowOperationType } from '@openops/shared';

const getSpotlightStepName = (
  operation: UndoHistoryRelevantFlowOperationRequest,
): string => {
  const { type, request } = operation;

  switch (type) {
    case FlowOperationType.DUPLICATE_ACTION:
      return request.stepName;
    case FlowOperationType.ADD_ACTION:
    case FlowOperationType.PASTE_ACTIONS:
      return request.parentStep;
    default:
      return request.name;
  }
};

const useApplyOperationAndPushToHistory = () => {
  const [applyOperation, flowVersion] = useBuilderStateContext((state) => [
    state.applyOperation,
    state.flowVersion,
  ]);

  const { addToUndoHistory, clearUndoRedoHistory } = useFlowVersionUndoRedo();

  return async (
    operation: UndoHistoryRelevantFlowOperationRequest,
    onError: () => void,
  ) => {
    try {
      const spotlightStepName = getSpotlightStepName(operation);

      await addToUndoHistory({
        snapshot: flowVersion.trigger,
        spotlightStepName,
        id: flowVersion.id,
      });

      return applyOperation(operation, onError);
    } catch {
      toast(UNSAVED_CHANGES_TOAST);
      clearUndoRedoHistory();
    }
  };
};

export { useApplyOperationAndPushToHistory };
