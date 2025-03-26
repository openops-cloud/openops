import { t } from 'i18next';
import { Copy } from 'lucide-react';

import {
  ContextMenuItem,
  ContextMenuType,
  useCanvasContext,
} from '@openops/components/ui';
import {
  Action,
  ActionType,
  FlagId,
  flowHelper,
  isNil,
  StepLocationRelativeToParent,
} from '@openops/shared';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useBuilderStateContext } from '../../builder-hooks';
import { usePaste } from '../../hooks/use-paste';
import { useSelection } from '../../hooks/use-selection';
import { CanvasShortcuts, ShortcutWrapper } from './canvas-shortcuts';
import { CanvasContextMenuProps } from './context-menu-wrapper';

export const CanvasContextMenuContent = ({
  contextMenuType,
  actionToPaste,
}: CanvasContextMenuProps) => {
  const showCopyPaste =
    flagsHooks.useFlag<boolean>(FlagId.COPY_PASTE_ACTIONS_ENABLED).data ||
    false;

  const [flowVersion, readonly] = useBuilderStateContext((state) => [
    state.flowVersion,
    state.readonly,
  ]);

  const { copySelectedArea, copyAction, pastePlusButton } = useCanvasContext();

  const { selectedStep, selectedNodes, firstSelectedNode } = useSelection();

  const disabled = selectedNodes.length === 0 && !selectedStep;
  const isSingleSelectedNode = selectedNodes.length === 1;

  const doSelectedNodesIncludeTrigger = selectedNodes.some(
    (node: string) => node === flowVersion.trigger.name,
  );

  const disabledPaste = isNil(actionToPaste);
  const showPasteAfterLastStep =
    !readonly && contextMenuType === ContextMenuType.CANVAS;
  const showPasteAsFirstLoopAction =
    isSingleSelectedNode &&
    firstSelectedNode?.type === ActionType.LOOP_ON_ITEMS &&
    !readonly &&
    contextMenuType === ContextMenuType.STEP;

  const showPasteAfterCurrentStep =
    (isSingleSelectedNode || selectedStep) &&
    !readonly &&
    contextMenuType === ContextMenuType.STEP;

  const showPasteInConditionBranch =
    contextMenuType === ContextMenuType.STEP &&
    firstSelectedNode?.type === ActionType.BRANCH;

  const showPasteInSplitBranch =
    contextMenuType === ContextMenuType.STEP &&
    firstSelectedNode?.type === ActionType.SPLIT;

  const showCopy =
    showCopyPaste &&
    !doSelectedNodesIncludeTrigger &&
    contextMenuType === ContextMenuType.STEP;

  const { onPaste } = usePaste();

  return (
    <>
      {showCopy && (
        <ContextMenuItem
          disabled={disabled}
          onClick={() => {
            if (selectedStep) {
              const step = flowHelper.getStep(flowVersion, selectedStep);
              copyAction(step as Action);
              return;
            }

            copySelectedArea();
          }}
        >
          <ShortcutWrapper shortcut={CanvasShortcuts['Copy']}>
            <Copy className="w-4 h-4"></Copy> {t('Copy')}
          </ShortcutWrapper>
        </ContextMenuItem>
      )}

      <>
        {showPasteAfterLastStep && !pastePlusButton && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() =>
              onPaste(
                actionToPaste as Action,
                StepLocationRelativeToParent.AFTER,
                selectedStep,
              )
            }
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4"></Copy>
            {selectedStep
              ? t('Paste after selection')
              : t('Paste after last step')}
          </ContextMenuItem>
        )}
        {showPasteAsFirstLoopAction && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() =>
              onPaste(
                actionToPaste as Action,
                StepLocationRelativeToParent.INSIDE_LOOP,
                selectedStep,
              )
            }
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4"></Copy>
            {t('Paste inside Loop')}
          </ContextMenuItem>
        )}
        {showPasteInConditionBranch && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() =>
              onPaste(
                actionToPaste as Action,
                StepLocationRelativeToParent.INSIDE_TRUE_BRANCH,
                selectedStep,
              )
            }
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4"></Copy>
            {t('Paste inside first branch')}
          </ContextMenuItem>
        )}
        {showPasteInSplitBranch && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() => {
              const branchNodeId = firstSelectedNode.settings.options[0].id;
              return onPaste(
                actionToPaste as Action,
                StepLocationRelativeToParent.INSIDE_SPLIT,
                selectedStep,
                branchNodeId,
              );
            }}
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4"></Copy>
            {t('Paste inside default branch')}
          </ContextMenuItem>
        )}
        {showPasteAfterCurrentStep && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() =>
              onPaste(
                actionToPaste as Action,
                StepLocationRelativeToParent.AFTER,
                selectedStep,
              )
            }
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4"></Copy>
            {t('Paste after')}
          </ContextMenuItem>
        )}
        {pastePlusButton && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() =>
              onPaste(
                actionToPaste as Action,
                pastePlusButton.plusStepLocation,
                pastePlusButton.parentStep,
                pastePlusButton.branchNodeId,
              )
            }
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4"></Copy>
            {t('Paste here')}
          </ContextMenuItem>
        )}
      </>
    </>
  );
};
