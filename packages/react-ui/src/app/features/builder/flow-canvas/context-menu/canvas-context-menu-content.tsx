import { t } from 'i18next';
import { ClipboardPaste, ClipboardPlus, Copy } from 'lucide-react';

import {
  ContextMenuItem,
  ContextMenuType,
  WorkflowNode,
} from '@openops/components/ui';
import { ActionType, FlagId, flowHelper } from '@openops/shared';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useReactFlow } from '@xyflow/react';
import { useBuilderStateContext } from '../../builder-hooks';
import { CanvasShortcuts, ShortcutWrapper } from './canvas-shortcuts';
import { CanvasContextMenuProps } from './context-menu-wrapper';

export const CanvasContextMenuContent = ({
  contextMenuType,
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

  const [flowVersion, readonly] = useBuilderStateContext((state) => [
    state.flowVersion,
    state.readonly,
  ]);

  const disabled = selectedNodes.length === 0;

  const doSelectedNodesIncludeTrigger = selectedNodes.some(
    (node: string) => node === flowVersion.trigger.name,
  );

  // https://linear.app/openops/issue/OPS-854/add-paste-logic
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

  return (
    <>
      {showCopy && (
        <ContextMenuItem
          disabled={disabled}
          onClick={() => {
            // https://linear.app/openops/issue/OPS-852/add-copy-logic
          }}
        >
          <ShortcutWrapper shortcut={CanvasShortcuts['Copy']}>
            <Copy className="w-4 h-4"></Copy> {t('Copy')}
          </ShortcutWrapper>
        </ContextMenuItem>
      )}

      <>
        {showPasteAfterLastStep && showCopyPaste && (
          <ContextMenuItem
            disabled={disabledPaste}
            onClick={() => {
              // // https://linear.app/openops/issue/OPS-854/add-paste-logic
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
              // https://linear.app/openops/issue/OPS-854/add-paste-logic
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
              // https://linear.app/openops/issue/OPS-854/add-paste-logic
            }}
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
