import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useClipboardContext } from '@openops/components/ui';
import {
  Action,
  ActionType,
  FlagId,
  StepLocationRelativeToParent,
} from '@openops/shared';
import { isNil } from 'lodash-es';
import { useKeyboardShortcut } from '../hooks/use-keyboard-shortcut';
import { usePaste } from '../hooks/use-paste';
import { useSelection } from '../hooks/use-selection';

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

  const { selectedStep, selectedNodes, getStepDetails } = useSelection();

  const { onPaste } = usePaste();
  const { actionToPaste } = useClipboardContext();
  const disabledPaste = isNil(actionToPaste);

  const canPerformOperation = () =>
    showCopyPaste && !disabledPaste && selectedNodes.length === 0;

  const onPasteOperation = (): void => {
    const selectedStepDetails = getStepDetails(selectedStep);

    const pasteMapping: Partial<
      Record<ActionType, StepLocationRelativeToParent>
    > = {
      [ActionType.LOOP_ON_ITEMS]: StepLocationRelativeToParent.INSIDE_LOOP,
      [ActionType.BRANCH]: StepLocationRelativeToParent.INSIDE_TRUE_BRANCH,
      [ActionType.SPLIT]: StepLocationRelativeToParent.INSIDE_SPLIT,
    };

    const location =
      selectedStepDetails && selectedStepDetails.type in pasteMapping
        ? pasteMapping[selectedStepDetails.type as ActionType]
        : StepLocationRelativeToParent.AFTER;

    if (!location) {
      return;
    }

    const additionalParam =
      selectedStepDetails?.type === ActionType.SPLIT
        ? selectedStepDetails.settings.options[0].id
        : undefined;

    onPaste(actionToPaste as Action, location, selectedStep, additionalParam);
  };

  const operationMap = {
    paste: onPasteOperation,
  };

  useKeyboardShortcut({
    operationName: 'paste',
    operationMap,
    keyCombinationMap: operationKeyboardKeyCombinationMap,
    canPerformOperation,
  });
};

export { useKeyboardPasteShortcut };
