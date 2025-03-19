import { t } from 'i18next';
import {
  ClipboardPaste,
  ClipboardPlus,
  Copy,
  CopyPlus,
  Trash,
} from 'lucide-react';

import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuType,
  toast,
  UNSAVED_CHANGES_TOAST,
  useCanvasContext,
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

export const CanvasContextMenuContent = ({
  contextMenuType,
}: CanvasContextMenuProps) => {
  const showCopyPaste =
    flagsHooks.useFlag<boolean>(FlagId.COPY_PASTE_ACTIONS_ENABLED).data ||
    false;
  const applyOperationAndPushToHistory = useApplyOperationAndPushToHistory();

  const { selectedActions } = useCanvasContext();
  const selectedNodes = selectedActions.map((action) => action.name);

  const [removeStepSelection, flowVersion, readonly] = useBuilderStateContext(
    (state) => [state.removeStepSelection, state.flowVersion, state.readonly],
  );

  const disabled = selectedNodes.length === 0;

  const doSelectedNodesIncludeTrigger = selectedNodes.some(
    (node: string) => node === flowVersion.trigger.name,
  );

  console.log('selectedNodes', selectedNodes);

  // to be implemented
  const disabledPaste = true;
  const firstSelectedStep = flowHelper.getStep(flowVersion, selectedNodes[0]);
  const showPasteAfterLastStep =
    !readonly && contextMenuType === ContextMenuType.CANVAS;
  const showPasteAsFirstLoopAction =
    selectedNodes.length === 1 &&
    firstSelectedStep?.type === ActionType.LOOP_ON_ITEMS &&
    !readonly &&
    contextMenuType === ContextMenuType.STEP;

  const showPasteAfterCurrentStep =
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
    !isTriggerTheOnlySelectedNode &&
    selectedActions.length === 1;

  // todo we need to extract those action to a reusable hook
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

  if (!showCopyPaste) {
    return null;
  }

  return (
    <>
      {showCopy && (
        <ContextMenuItem
          disabled={disabled}
          onClick={() => {
            // handle copy
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
