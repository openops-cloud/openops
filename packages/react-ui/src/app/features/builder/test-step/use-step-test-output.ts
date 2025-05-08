import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { Action, FlagId, isEmpty, isNil, Trigger } from '@openops/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { flowsApi } from '../../flows/lib/flows-api';

export const useStepTestOuput = (
  flowVersionId: string,
  form: UseFormReturn<Action> | UseFormReturn<Trigger>,
) => {
  const { data: useNewExternalTestData = false } = flagsHooks.useFlag(
    FlagId.USE_NEW_EXTERNAL_TESTDATA,
  );
  const fallbackData = useWatch({
    name: 'settings.inputUiInfo.currentSelectedData',
    control: form.control as any,
  }) as unknown;

  const lastTestDate = useWatch({
    name: 'settings.inputUiInfo.lastTestDate',
    control: form.control as any,
  }) as unknown;
  const { id: stepId } = form.getValues();

  const queryClient = useQueryClient();

  const getFallbackData = () => ({
    output: form.watch(
      'settings.inputUiInfo.currentSelectedData' as any,
    ) as unknown,
    lastTestDate: form.watch(
      'settings.inputUiInfo.lastTestDate' as any,
    ) as unknown as string,
  });

  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ['actionTestOutput', flowVersionId, stepId],
    });
  }, [fallbackData, lastTestDate, flowVersionId, queryClient, stepId]);

  return useQuery({
    queryKey: ['actionTestOutput', flowVersionId, stepId],
    queryFn: async () => {
      if (!stepId || !useNewExternalTestData) {
        return getFallbackData();
      }

      const stepTestOuput = await flowsApi.getStepTestOutput(
        flowVersionId,
        stepId,
      );

      if (isNil(stepTestOuput) || isEmpty(stepTestOuput)) {
        return getFallbackData();
      }

      return stepTestOuput;
    },
  });
};
