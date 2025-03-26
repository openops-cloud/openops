import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { usePasteActionsInClipboard } from '@openops/components/ui';
import {
  Action,
  ActionType,
  FlagId,
  isNil,
  StepLocationRelativeToParent,
} from '@openops/shared';
import { useSelection } from '../../hooks/selection';
import { usePaste } from '../../hooks/use-paste';
import { useKeyboardShortcut } from './keyboard/use-keyboard-shortcut';

const operationKeyboardKeyCombinationMap = {
  paste: [
    { key: 'v', modifiers: ['ctrlKey'] },
    { key: 'v', modifiers: ['metaKey'] },
  ],
};

const useKeyboardPasteShortcut = () => {
  const showCopyPaste =
    flagsHooks.useFlag<boolean>(FlagId.COPY_PASTE_ACTIONS_ENABLED).data ||
    false;

  //   const isAction = flowHelper.isAction(data.step!.type);

  const {
    disabled: hasNoSelection,
    selectedStep,
    doSelectedNodesIncludeTrigger,
    selectedNodes,
    readonly,
    firstSelectedNode,
    getStepDetails,
  } = useSelection();

  const { onPaste } = usePaste();
  const { actionToPaste } = usePasteActionsInClipboard();
  const disabledPaste = isNil(actionToPaste);
  console.log('disabledPaste', disabledPaste);
  const canPerformOperation = () =>
    showCopyPaste && !disabledPaste && selectedNodes.length <= 1;

  const onPasteOperation = (): void => {
    const selectedStepDetails = getStepDetails(selectedStep);
    const effectiveSingleSelectedNode =
      firstSelectedNode || selectedStepDetails;

    if (effectiveSingleSelectedNode?.type === ActionType.LOOP_ON_ITEMS) {
      onPaste(
        actionToPaste as Action,
        StepLocationRelativeToParent.INSIDE_LOOP,
        effectiveSingleSelectedNode.name,
      );
      console.warn('onPaste inside loop');
    }

    //paste after, piece is selected paste the data right after the step.
    //   onPaste(
    //     actionToPaste as Action,
    //     StepLocationRelativeToParent.AFTER,
    //     selectedStep,
    //   );
    //paste inside loop
    //   onPaste(
    //     actionToPaste as Action,
    //     StepLocationRelativeToParent.INSIDE_LOOP,
    //     data.step.name,
    //   );
    //paste inside true branch
    //   onPaste(
    //     actionToPaste as Action,
    //     StepLocationRelativeToParent.INSIDE_TRUE_BRANCH,
    //     data.step.name,
    //   );
    //paste inside default branch
    //   onPaste(
    //     actionToPaste as Action,
    //     StepLocationRelativeToParent.INSIDE_SPLIT,
    //     data.step.name,
    //     branchNodeId,
    //   );
  };

  const operationMap = {
    paste: onPasteOperation,
  };

  useKeyboardShortcut({
    operationName: 'paste',
    operationMap,
    keyCombinationMap: operationKeyboardKeyCombinationMap,
    canPerformOperation,
    containerId: 'flow-canvas-container',
  });
};

export { useKeyboardPasteShortcut };
