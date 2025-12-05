import { ActionBase } from '@openops/blocks-framework';
import {
  BlockStepMetadataWithSuggestions,
  StepMetadataWithSuggestions,
} from '@openops/components/ui';
import { Action, ActionType, RiskLevel, Trigger } from '@openops/shared';

type ActionOrTriggerWithIndex = (Action | Trigger) & { index: number };

export const getActionMetadata = (
  metadata: StepMetadataWithSuggestions[] | undefined,
  blockName: string,
  actionName: string | undefined,
): ActionBase | undefined => {
  const blockStepMetadata = metadata?.find(
    (stepMetadata: StepMetadataWithSuggestions) =>
      stepMetadata.type === ActionType.BLOCK &&
      (stepMetadata as BlockStepMetadataWithSuggestions).blockName ===
        blockName,
  ) as BlockStepMetadataWithSuggestions | undefined;

  return blockStepMetadata?.suggestedActions?.find(
    (suggestedAction) => suggestedAction.name === actionName,
  );
};

export const getRiskyActionFormattedNames = (
  allSteps: (Action | Trigger)[],
  metadata: StepMetadataWithSuggestions[] | undefined,
  riskLevel: RiskLevel,
) =>
  allSteps
    .map((step, index) => ({ ...step, index }))
    .filter((step: ActionOrTriggerWithIndex) => step.type === ActionType.BLOCK)
    .map((action) => {
      return {
        action,
        metadata: getActionMetadata(
          metadata,
          action.settings.blockName,
          action.settings.actionName,
        ),
      };
    })
    .filter((actionWithMetadata) => {
      return actionWithMetadata.metadata?.riskLevel === riskLevel;
    })
    .map((actionWithMetadata) => {
      const actionMetadataDisplayName =
        actionWithMetadata.metadata?.displayName;

      return !actionMetadataDisplayName ||
        actionWithMetadata.action.displayName === actionMetadataDisplayName
        ? `${actionWithMetadata.action.index + 1}. ${
            actionWithMetadata.action.displayName
          }`
        : `${actionWithMetadata.action.index + 1}. ${
            actionWithMetadata.action.displayName
          } (${actionMetadataDisplayName})`;
    });
