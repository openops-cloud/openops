import { QueryKeys } from '@/app/constants/query-keys';
import { Action, Trigger } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { UseFormReturn } from 'react-hook-form';
import { flowsApi } from '../../flows/lib/flows-api';
import { stepTestOutputCache } from '../data-selector/data-selector-cache';

export const stepTestOutputHooks = {
  useStepTestOutput(flowVersionId: string, stepId: string) {
    return useQuery({
      queryKey: [QueryKeys.stepTestOutput, flowVersionId, stepId],
      queryFn: async () => {
        const stepTestOutput = await flowsApi.getStepTestOutput(
          flowVersionId,
          stepId,
        );

        stepTestOutputCache.setStepData(stepId, stepTestOutput);

        return stepTestOutput;
      },
    });
  },

  useStepTestOutputFormData(
    flowVersionId: string,
    form: UseFormReturn<Action> | UseFormReturn<Trigger>,
  ) {
    const { id: stepId } = form.getValues();

    return stepTestOutputHooks.useStepTestOutput(flowVersionId, stepId);
  },
};
