import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { Action, FlagId, Trigger } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
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
  const { id: stepId } = form.getValues();

  return useQuery({
    queryKey: ['actionTestOutput', flowVersionId, stepId],
    queryFn: async () => {
      if (!stepId || !useNewExternalTestData) {
        return fallbackData;
      }

      return (
        (await flowsApi.getStepTestOutput(flowVersionId, stepId)) ??
        fallbackData
      );
    },
  });
};
