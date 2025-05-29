import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { QueryKeys } from '@/app/constants/query-keys';
import { Action, FlagId, Trigger } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { UseFormReturn } from 'react-hook-form';
import { flowsApi } from '../../flows/lib/flows-api';
import { stepTestOutputCache } from '../data-selector/data-selector-cache';

type FallbackDataInput =
  | (() => {
      output: unknown;
      lastTestDate: string;
    })
  | { output: unknown; lastTestDate: string };

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
        ? (
            fallbackDataInput as () => {
              output: unknown;
              lastTestDate: string;
            }
          )() ?? {}
        : fallbackDataInput ?? {};

    return useQuery({
      queryKey: [QueryKeys.stepTestOutput, flowVersionId, stepId],
      queryFn: async () => {
        if (!useNewExternalTestData) {
          return resolveFallbackData();
        }

        const stepTestOutput = await flowsApi.getStepTestOutput(
          flowVersionId,
          stepId!,
        );

        stepTestOutputCache.setStepData(stepId!, stepTestOutput);

        return stepTestOutput;
      },
    });
  },

  useStepTestOutputFormData(
    flowVersionId: string,
    form: UseFormReturn<Action> | UseFormReturn<Trigger>,
  ) {
    const { id: stepId } = form.getValues();

    const getFallbackData = () => ({
      output: form.watch(
        'settings.inputUiInfo.currentSelectedData' as any,
      ) as unknown,
      lastTestDate: form.watch(
        'settings.inputUiInfo.lastTestDate' as any,
      ) as unknown as string,
    });

    return stepTestOutputHooks.useStepTestOutput(
      flowVersionId,
      stepId,
      getFallbackData,
    );
  },
};
