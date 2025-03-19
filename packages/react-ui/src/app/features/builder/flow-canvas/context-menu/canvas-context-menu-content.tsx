import { t } from 'i18next';
import {
  ArrowLeftRight,
  ClipboardPaste,
  ClipboardPlus,
  Copy,
  CopyPlus,
  Trash,
} from 'lucide-react';

import {
  ContextMenuItem,
  ContextMenuSeparator,
  toast,
  UNSAVED_CHANGES_TOAST,
} from '@openops/components/ui';
import {
  ActionType,
  FlagId,
  flowHelper,
  FlowOperationType,
} from '@openops/shared';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useBuilderStateContext } from '../../builder-hooks';
import { useApplyOperationAndPushToHistory } from '../../flow-version-undo-redo/hooks/apply-operation-and-push-to-history';
import { CanvasShortcuts, ShortcutWrapper } from './canvas-shortcuts';
import { CanvasContextMenuProps } from './context-menu-wrapper';
import { ContextMenuType } from './types';

export const CanvasContextMenuContent = ({
  contextMenuType,
}: CanvasContextMenuProps) => {
  const showCopyPaste =
    flagsHooks.useFlag<boolean>(FlagId.COPY_PASTE_ACTIONS_ENABLED).data ||
    false;
  const applyOperationAndPushToHistory = useApplyOperationAndPushToHistory();

  const [
    selectedNodes,
    selectStepByName,
    removeStepSelection,
    setAllowCanvasPanning,
    flowVersion,
    actionsToPaste,
    readonly,
    setPieceSelectorStep,
  ] = useBuilderStateContext((state) => [
    state.selectedNodes,
    state.selectStepByName,
    state.removeStepSelection,
    state.setAllowCanvasPanning,
    state.flowVersion,
    state.actionsToPaste,
    state.readonly,
    state.setPieceSelectorStep,
  ]);

  const disabled = selectedNodes.length === 0;

  const doSelectedNodesIncludeTrigger = selectedNodes.some(
    (node: string) => node === flowVersion.trigger.name,
  );
  const disabledPaste = actionsToPaste.length === 0;
  const firstSelectedStep = flowHelper.getStep(flowVersion, selectedNodes[0]);
  const showPasteAfterLastStep =
    !readonly && contextMenuType === ContextMenuType.CANVAS;
  const showPasteAsFirstLoopAction =
    selectedNodes.length === 1 &&
    firstSelectedStep?.type === ActionType.LOOP_ON_ITEMS &&
    !readonly &&
    contextMenuType === ContextMenuType.STEP;

  // todo split handling
  // const showPasteAsBranchChild =

  const showPasteAfterCurrentStep =
    selectedNodes.length === 1 &&
    !readonly &&
    contextMenuType === ContextMenuType.STEP;

  const showReplace =
    selectedNodes.length === 1 &&
    !readonly &&
    contextMenuType === ContextMenuType.STEP;

  const showCopy =
    showCopyPaste &&
    !doSelectedNodesIncludeTrigger &&
    contextMenuType === ContextMenuType.STEP;

  const showDuplicate =
    selectedNodes.length === 1 &&
    !doSelectedNodesIncludeTrigger &&
    contextMenuType === ContextMenuType.STEP &&
    !readonly;

  const isTriggerTheOnlySelectedNode =
    selectedNodes.length === 1 && doSelectedNodesIncludeTrigger;
  const showDelete =
    !readonly &&
    contextMenuType === ContextMenuType.STEP &&
    !isTriggerTheOnlySelectedNode;

  // todo we need to change it to handle delete for multiple nodes
  const deleteStep = () => {
    if (selectedNodes.length !== 1) {
      return;
    }
    applyOperationAndPushToHistory(
      {
        type: FlowOperationType.DELETE_ACTION,
        request: {
          name: selectedNodes[0],
        },
      },
      () => toast(UNSAVED_CHANGES_TOAST),
    );
    removeStepSelection();
  };

  const duplicateStep = () => {
    if (selectedNodes.length !== 1) {
      return;
    }
    return applyOperationAndPushToHistory(
      {
        type: FlowOperationType.DUPLICATE_ACTION,
        request: {
          stepName: selectedNodes[0],
        },
      },
      () => toast(UNSAVED_CHANGES_TOAST),
    );
  };

  return (
    <>
      {showReplace && (
        <ContextMenuItem
          disabled={disabled}
          onClick={() => {
            setPieceSelectorStep(selectedNodes[0]);
          }}
          className="flex items-center gap-2"
        >
          <ArrowLeftRight className="w-4 h-4"></ArrowLeftRight> {t('Replace')}
        </ContextMenuItem>
      )}
      {showCopy && (
        <ContextMenuItem
          disabled={disabled}
          onClick={() => {
            // copySelectedNodes({ selectedNodes, flowVersion });
          }}
        >
          <ShortcutWrapper shortcut={CanvasShortcuts['Copy']}>
            <Copy className="w-4 h-4"></Copy> {t('Copy')}
          </ShortcutWrapper>
        </ContextMenuItem>
      )}

      <>
        {showDuplicate && (
          <ContextMenuItem
            disabled={disabled}
            onClick={duplicateStep}
            className="flex items-center gap-2"
          >
            <CopyPlus className="w-4 h-4"></CopyPlus> {t('Duplicate')}
          </ContextMenuItem>
        )}

        {(showPasteAsFirstLoopAction ||
          //   showPasteAsBranchChild ||
          showPasteAfterCurrentStep) && (
          <ContextMenuSeparator></ContextMenuSeparator>
        )}

        {showPasteAfterLastStep && showCopyPaste && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() => {
              // todo paste logic
            }}
            className="flex items-center gap-2"
          >
            <ClipboardPlus className="w-4 h-4"></ClipboardPlus>{' '}
            {t('Paste After Last Step')}
          </ContextMenuItem>
        )}

        {showPasteAsFirstLoopAction && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() => {
              // todo paste logic
            }}
            className="flex items-center gap-2"
          >
            <ClipboardPaste className="w-4 h-4"></ClipboardPaste>{' '}
            {t('Paste Inside Loop')}
          </ContextMenuItem>
        )}

        {showPasteAfterCurrentStep && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() => {
              // todo paste logic
            }}
            className="flex items-center gap-2"
          >
            <ClipboardPlus className="w-4 h-4"></ClipboardPlus>{' '}
            {t('Paste After')}
          </ContextMenuItem>
        )}

        {showDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={disabled}
              onClick={() => {
                deleteStep();
                // todo add deleteSelectedNodes
              }}
            >
              <ShortcutWrapper shortcut={CanvasShortcuts['Delete']}>
                <Trash className="w-4 stroke-destructive h-4"></Trash>{' '}
                <div className="text-destructive">{t('Delete')}</div>
              </ShortcutWrapper>
            </ContextMenuItem>
          </>
        )}
      </>
    </>
  );
};
