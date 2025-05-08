import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { Action, FlagId, isEmpty, isNil, Trigger } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { UseFormReturn } from 'react-hook-form';
import { flowsApi } from '../../flows/lib/flows-api';

export const useStepTestOuput = (
  flowVersionId: string,
  form: UseFormReturn<Action> | UseFormReturn<Trigger>,
) => {
  const { data: useNewExternalTestData = false } = flagsHooks.useFlag(
    FlagId.USE_NEW_EXTERNAL_TESTDATA,
  );

  const { id: stepId } = form.getValues();

  const getFallbackData = () => ({
    output: form.watch(
      'settings.inputUiInfo.currentSelectedData' as any,
    ) as unknown,
    lastTestDate: form.watch(
      'settings.inputUiInfo.lastTestDate' as any,
    ) as unknown as string,
  });

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
