import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { Action, FlagId, isEmpty, isNil, Trigger } from '@openops/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { flowsApi } from '../../flows/lib/flows-api';

type FallbackDataInput = (() => unknown) | unknown;

export const stepTestOutputHooks = {
  useStepTestOutput(
    flowVersionId: string,
    stepId: string | undefined,
    fallbackDataInput: FallbackDataInput,
  ) {
    const { data: useNewExternalTestData = false } = flagsHooks.useFlag(
      FlagId.USE_NEW_EXTERNAL_TESTDATA,
    );

    const resolveFallbackData = () =>
      typeof fallbackDataInput === 'function'
        ? (fallbackDataInput as () => unknown)()
        : fallbackDataInput;

    return useQuery({
      queryKey: ['actionTestOutput', flowVersionId, stepId],
      queryFn: async () => {
        if (!stepId || !useNewExternalTestData) {
          return resolveFallbackData();
        }

        const stepTestOutput = await flowsApi.getStepTestOutput(
          flowVersionId,
          stepId,
        );

        if (isNil(stepTestOutput) || isEmpty(stepTestOutput)) {
          return resolveFallbackData();
        }

        return stepTestOutput;
      },
    });
  },
  useStepTestOutputFormData(
    flowVersionId: string,
    form: UseFormReturn<Action> | UseFormReturn<Trigger>,
  ) {
    const fallbackData = useWatch({
      name: 'settings.inputUiInfo.currentSelectedData',
      control: form.control as any,
    }) as unknown;
    const { id: stepId } = form.getValues();

    const queryClient = useQueryClient();

    const getFallbackData = () =>
      form.watch('settings.inputUiInfo.currentSelectedData' as any);

    useEffect(() => {
      queryClient.invalidateQueries({
        queryKey: ['actionTestOutput', flowVersionId, stepId],
      });
    }, [fallbackData, flowVersionId, queryClient, stepId]);

    return stepTestOutputHooks.useStepTestOutput(
      flowVersionId,
      stepId,
      getFallbackData,
    );
  },
};
