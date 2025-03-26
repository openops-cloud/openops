import { t } from 'i18next';
import { Copy } from 'lucide-react';

import {
  ContextMenuItem,
  ContextMenuType,
  useCanvasContext,
  WorkflowNode,
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
import { useReactFlow } from '@xyflow/react';
import { useBuilderStateContext } from '../../builder-hooks';
import { usePaste } from '../../hooks/use-paste';
import { CanvasShortcuts, ShortcutWrapper } from './canvas-shortcuts';
import { CanvasContextMenuProps } from './context-menu-wrapper';

export const CanvasContextMenuContent = ({
  contextMenuType,
  actionToPaste,
}: CanvasContextMenuProps) => {
  const showCopyPaste =
    flagsHooks.useFlag<boolean>(FlagId.COPY_PASTE_ACTIONS_ENABLED).data ||
    false;

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

  const { copySelectedArea, copyAction } = useCanvasContext();

  const disabled = selectedNodes.length === 0 && !selectedStep;
  const isSingleSelectedNode = selectedNodes.length === 1;

  const doSelectedNodesIncludeTrigger = selectedNodes.some(
    (node: string) => node === flowVersion.trigger.name,
  );

  const disabledPaste = isNil(actionToPaste);
  const firstSelectedStep = flowHelper.getStep(flowVersion, selectedNodes[0]);
  const showPasteAfterLastStep =
    !readonly && contextMenuType === ContextMenuType.CANVAS;
  const showPasteAsFirstLoopAction =
    isSingleSelectedNode &&
    firstSelectedStep?.type === ActionType.LOOP_ON_ITEMS &&
    !readonly &&
    contextMenuType === ContextMenuType.STEP;

  const showPasteAfterCurrentStep =
    (isSingleSelectedNode || selectedStep) &&
    !readonly &&
    contextMenuType === ContextMenuType.STEP;

  const showPasteInConditionBranch =
    contextMenuType === ContextMenuType.STEP &&
    firstSelectedStep?.type === ActionType.BRANCH;

  const showPasteInSplitBranch =
    contextMenuType === ContextMenuType.STEP &&
    firstSelectedStep?.type === ActionType.SPLIT;

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
        {showPasteAfterLastStep && (
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
              const branchNodeId = firstSelectedStep.settings.options[0].id;
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
            {t('Paste After')}
          </ContextMenuItem>
        )}
      </>
    </>
  );
};
