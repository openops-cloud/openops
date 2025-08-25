import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { QueryKeys } from '@/app/constants/query-keys';
import { toast } from '@openops/components/ui';
import { Action, FlagId, Trigger } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { flowsApi } from '../../flows/lib/flows-api';
import { stepTestOutputCache } from '../data-selector/data-selector-cache';

export const stepTestOutputHooks = {
  useStepTestOutput(flowVersionId: string, stepId: string) {
    return useQuery({
      queryKey: [QueryKeys.stepTestOutput, flowVersionId, stepId],
      queryFn: async ({ signal }) => {
        const stepTestOutput = await flowsApi.getStepTestOutput(
          flowVersionId,
          stepId,
        );

        if (!signal?.aborted) {
          stepTestOutputCache.setStepData(stepId, stepTestOutput);
        }

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
  useSaveSelectedStepSampleData(form: UseFormReturn<Action | Trigger>) {
    const { data: sampleDataSizeLimit } = flagsHooks.useFlag<number>(
      FlagId.SAMPLE_DATA_SIZE_LIMIT_KB,
    );

    return useCallback(
      (sampleData: unknown) => {
        const validation = validateSampleDataSize(
          sampleData,
          sampleDataSizeLimit,
        );
        if (!validation.isValid) {
          toast({
            title: validation.errorMessage,
            variant: 'destructive',
          });
          return;
        }

        form.setValue('settings.inputUiInfo.sampleData', sampleData, {
          shouldValidate: true,
        });
      },
      [sampleDataSizeLimit, form],
    );
  },
};

const valid = { isValid: true };
export function validateSampleDataSize(
  sampleData: unknown,
  sizeLimitKb: number | null,
): { isValid: boolean; errorMessage?: string } {
  if (!sizeLimitKb) {
    return valid;
  }

  let size = 0;
  if (typeof sampleData === 'string') {
    size = new TextEncoder().encode(sampleData).length;
  } else {
    try {
      size = new TextEncoder().encode(JSON.stringify(sampleData)).length;
    } catch {
      size = 0;
    }
  }
  if (size > sizeLimitKb * 1024) {
    return {
      isValid: false,
      errorMessage: t(
        'Sample data is too large. The maximum allowed size is {maxKb} KB.',
        {
          maxKb: sizeLimitKb,
        },
      ),
    };
  }
  return valid;
}
