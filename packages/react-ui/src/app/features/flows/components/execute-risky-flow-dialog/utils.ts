import { StepMetadataWithSuggestions } from '@openops/components/ui';
import { Action, ActionType, RiskLevel, Trigger } from '@openops/shared';
import { flowsUtils } from '@/app/features/flows/lib/flows-utils';

type ActionOrTriggerWithIndex = (Action | Trigger) & { index: number };

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
        metadata: flowsUtils.getActionMetadata(
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
