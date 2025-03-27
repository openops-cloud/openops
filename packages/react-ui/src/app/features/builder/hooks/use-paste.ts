import {
  copyPasteToast,
  toast,
  UNSAVED_CHANGES_TOAST,
} from '@openops/components/ui';
import {
  Action,
  flowHelper,
  FlowOperationType,
  FlowVersion,
  isNil,
  StepLocationRelativeToParent,
} from '@openops/shared';
import { useCallback } from 'react';
import { useBuilderStateContext } from '../builder-hooks';
import { useApplyOperationAndPushToHistory } from '../flow-version-undo-redo/hooks/apply-operation-and-push-to-history';

export const usePaste = () => {
  const applyOperationAndPushToHistory = useApplyOperationAndPushToHistory();
  const flowVersion = useBuilderStateContext((state) => state.flowVersion);

  const onPaste = useCallback(
    (
      actionToPaste: Action,
      stepLocationRelativeToParent: StepLocationRelativeToParent,
      selectedStep: string | null,
      branchNodeId?: string,
    ) => {
      if (isNil(actionToPaste)) {
        return;
      }

      const itemsCount = flowHelper.getAllSteps(actionToPaste).length;
      applyOperationAndPushToHistory(
        {
          type: FlowOperationType.PASTE_ACTIONS,
          request: {
            action: actionToPaste,
            parentStep: getParentStepForPaste(flowVersion, selectedStep),
            stepLocationRelativeToParent,
            branchNodeId,
          },
        },
        () => toast(UNSAVED_CHANGES_TOAST),
      ).then(() => {
        copyPasteToast({
          success: true,
          isCopy: false,
          itemsCount,
        });
      });
    },
    [applyOperationAndPushToHistory, flowVersion],
  );

  return {
    onPaste,
  };
};

const getParentStepForPaste = (
  flowVersion: FlowVersion,
  selectedStep: string | null,
) => {
  if (selectedStep) {
    return selectedStep;
  }

  const allSteps = flowHelper.getAllSteps(flowVersion.trigger);
  const lastStep = allSteps[allSteps.length - 1];

  return lastStep.name;
};
