import {
  ActionBase,
  BlockMetadataModel,
  TriggerBase,
} from '@openops/blocks-framework';
import { Action, ActionType, Trigger, TriggerType } from '@openops/shared';

export const getStepTemplateModel = (
  selectedStep: Action | Trigger,
  blockModel: BlockMetadataModel | undefined,
): ActionBase | TriggerBase | undefined => {
  if (selectedStep.type === TriggerType.BLOCK) {
    return blockModel?.triggers[selectedStep.settings.triggerName || ''];
  }
  if (selectedStep.type === ActionType.BLOCK) {
    return blockModel?.actions[selectedStep.settings.actionName || ''];
  }
  return undefined;
};
