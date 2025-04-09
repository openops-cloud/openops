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
  flowHelper,
  StepLocationRelativeToParent,
} from '@openops/shared';

import { hasSecureClipboardAccess } from '@/app/lib/secure-clipboard-access-utils';
import { useBuilderStateContext } from '../../builder-hooks';
import { usePaste } from '../../hooks/use-paste';
import { useSelection } from '../../hooks/use-selection';
import { CanvasShortcuts, ShortcutWrapper } from './canvas-shortcuts';
import { CanvasContextMenuProps } from './context-menu-wrapper';

export const CanvasContextMenuContent = ({
  contextMenuType,
  actionToPaste,
}: CanvasContextMenuProps) => {
  const [flowVersion, readonly] = useBuilderStateContext((state) => [
    state.flowVersion,
    state.readonly,
  ]);

  const { copySelectedArea, copyAction, pastePlusButton } = useCanvasContext();

  const { selectedStep, selectedNodes, firstSelectedNode } = useSelection();

  const disabled = selectedNodes.length === 0 && !selectedStep;
  const isSingleSelectedNode = selectedNodes.length === 1;

  const doSelectedNodesIncludeTrigger =
    selectedNodes.some((node: string) => node === flowVersion.trigger.name) ||
    selectedStep === flowVersion.trigger.name;

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
    !doSelectedNodesIncludeTrigger && contextMenuType === ContextMenuType.STEP;

  const { onPaste } = usePaste();

  if (!showCopy && !hasSecureClipboardAccess) {
    return (
      <span className="text-sm select-none px-2 py-1.5">
        {t('No actions available')}
      </span>
    );
  }

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

      {hasSecureClipboardAccess && (
        <>
          {showPasteAfterLastStep && !pastePlusButton && (
            <ContextMenuItem
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
      )}
    </>
  );
};
