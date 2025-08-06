import {
  Action,
  ChatFlowContext,
  FlowVersion,
  TriggerWithOptionalId,
} from '@openops/shared';

export type StepDetails = Action | TriggerWithOptionalId | undefined;

export const createAdditionalContext = (
  flowVersion: FlowVersion,
  stepData?: StepDetails,
): ChatFlowContext => {
  const stepVariables = stepData?.settings?.input || {};
  const variables = Object.entries(stepVariables).map(([name, value]) => ({
    name,
    value: String(value || ''),
  }));

  return {
    flowId: flowVersion.flowId,
    flowVersionId: flowVersion.id,
    currentStepId: stepData?.id ?? '',
    steps: [
      {
        id: stepData?.id ?? '',
        stepName: stepData?.name ?? '',
        variables: variables.length > 0 ? variables : undefined,
      },
    ],
  };
};
