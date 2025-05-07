import { Action, Trigger } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { flowsApi } from '../../flows/lib/flows-api';

export const useStepTestOuput = (
  flowVersionId: string,
  form: UseFormReturn<Action> | UseFormReturn<Trigger>,
) => {
  const fallbackData = useWatch({
    name: 'settings.inputUiInfo.currentSelectedData',
    control: form.control as any,
  }) as unknown;
  const { id } = form.getValues();

  return useQuery({
    queryKey: ['actionTestOutput', flowVersionId, id],
    queryFn: async () => {
      if (!id) {
        return fallbackData;
      }

      return (
        (await flowsApi.getStepTestOutput(flowVersionId, id)) ?? fallbackData
      );
    },
  });
};
