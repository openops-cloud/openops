import { t } from 'i18next';
import { ClipboardPaste, ClipboardPlus, Copy } from 'lucide-react';

import {
  ContextMenuItem,
  ContextMenuType,
  toast,
  UNSAVED_CHANGES_TOAST,
  useCanvasContext,
  WorkflowNode,
} from '@openops/components/ui';
import {
  ActionType,
  FlagId,
  flowHelper,
  FlowOperationType,
  FlowVersion,
  isNil,
  StepLocationRelativeToParent,
} from '@openops/shared';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { useBuilderStateContext } from '../../builder-hooks';
import { useApplyOperationAndPushToHistory } from '../../flow-version-undo-redo/hooks/apply-operation-and-push-to-history';
import { CanvasShortcuts, ShortcutWrapper } from './canvas-shortcuts';
import { CanvasContextMenuProps } from './context-menu-wrapper';

export const CanvasContextMenuContent = ({
  contextMenuType,
  actionToPaste,
}: CanvasContextMenuProps) => {
  const showCopyPaste =
    flagsHooks.useFlag<boolean>(FlagId.COPY_PASTE_ACTIONS_ENABLED).data ||
    false;

  const applyOperationAndPushToHistory = useApplyOperationAndPushToHistory();

  const { getNodes } = useReactFlow();
  const nodes = getNodes() as WorkflowNode[];

  const selectedNodes = nodes
    .filter((node) => node.selected)
    .reduce((acc, node) => {
      const name = node.data.step?.name;
      if (name !== undefined) {
        acc.push(name);
      }
      return acc;
    }, [] as string[]);

  const [flowVersion, readonly, selectedStep] = useBuilderStateContext(
    (state) => [state.flowVersion, state.readonly, state.selectedStep],
  );

  const { copy } = useCanvasContext();

  const disabled = selectedNodes.length === 0;

  const doSelectedNodesIncludeTrigger = selectedNodes.some(
    (node: string) => node === flowVersion.trigger.name,
  );

  const disabledPaste = isNil(actionToPaste);
  const firstSelectedStep = flowHelper.getStep(flowVersion, selectedNodes[0]);
  const showPasteAfterLastStep =
    !readonly && contextMenuType === ContextMenuType.CANVAS;
  const showPasteAsFirstLoopAction =
    selectedNodes.length === 1 &&
    firstSelectedStep?.type === ActionType.LOOP_ON_ITEMS &&
    !readonly &&
    contextMenuType === ContextMenuType.STEP;

  const showPasteAfterCurrentStep =
    (selectedNodes.length === 1 || selectedStep) &&
    !readonly &&
    contextMenuType === ContextMenuType.STEP;

  const showPasteInConditionBranch =
    contextMenuType === ContextMenuType.STEP &&
    firstSelectedStep?.type === ActionType.BRANCH;

  const showCopy =
    showCopyPaste &&
    !doSelectedNodesIncludeTrigger &&
    contextMenuType === ContextMenuType.STEP;

  const onPaste = useCallback(
    (
      stepLocationRelativeToParent: StepLocationRelativeToParent,
      selectedStep: string | null,
      branchNodeId?: string,
    ) => {
      if (isNil(actionToPaste)) {
        return;
      }
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
      );
    },
    [actionToPaste, flowVersion],
  );

  return (
    <>
      {showCopy && (
        <ContextMenuItem disabled={disabled} onClick={copy}>
          <ShortcutWrapper shortcut={CanvasShortcuts['Copy']}>
            <Copy className="w-4 h-4"></Copy> {t('Copy')}
          </ShortcutWrapper>
        </ContextMenuItem>
      )}

      <>
        {showPasteAfterLastStep && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() =>
              onPaste(StepLocationRelativeToParent.AFTER, selectedStep)
            }
            className="flex items-center gap-2"
          >
            <ClipboardPlus className="w-4 h-4"></ClipboardPlus>{' '}
            {t('Paste After Last Step')}
          </ContextMenuItem>
        )}
        {showPasteAsFirstLoopAction && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() =>
              onPaste(StepLocationRelativeToParent.INSIDE_LOOP, selectedStep)
            }
            className="flex items-center gap-2"
          >
            <ClipboardPaste className="w-4 h-4"></ClipboardPaste>{' '}
            {t('Paste inside Loop')}
          </ContextMenuItem>
        )}
        {showPasteInConditionBranch && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() =>
              onPaste(
                StepLocationRelativeToParent.INSIDE_TRUE_BRANCH,
                selectedStep,
              )
            }
            className="flex items-center gap-2"
          >
            <ClipboardPaste className="w-4 h-4"></ClipboardPaste>{' '}
            {t('Paste inside first Branch')}
          </ContextMenuItem>
        )}
        {showPasteAfterCurrentStep && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() =>
              onPaste(StepLocationRelativeToParent.AFTER, selectedStep)
            }
            className="flex items-center gap-2"
          >
            <ClipboardPlus className="w-4 h-4"></ClipboardPlus>{' '}
            {t('Paste After')}
          </ContextMenuItem>
        )}
      </>
    </>
  );
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
