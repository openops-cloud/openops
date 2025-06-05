import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { QueryKeys } from '@/app/constants/query-keys';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { useStepSettingsContext } from '@/app/features/builder/step-settings/step-settings-context';
import { toast, UNSAVED_CHANGES_TOAST } from '@openops/components/ui';
import {
  Action,
  FlagId,
  flowHelper,
  FlowOperationType,
  Trigger,
} from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
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
        if (!stepId || !useNewExternalTestData) {
          return resolveFallbackData();
        }

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
  useSaveSelectedStepSampleData() {
    const { selectedStep } = useStepSettingsContext();

    const [applyOperation] = useBuilderStateContext((state) => [
      state.applyOperation,
    ]);

    return useCallback(
      (sampleData: unknown) => {
        const isTrigger = flowHelper.isTrigger(selectedStep.type);
        const updatedStep = {
          ...selectedStep,
          settings: {
            ...selectedStep.settings,
            inputUiInfo: {
              ...selectedStep.settings.inputUiInfo,
              sampleData: sampleData,
            },
          },
        };

        const createOperation = () => {
          if (isTrigger) {
            return {
              type: FlowOperationType.UPDATE_TRIGGER as const,
              request: updatedStep as Trigger,
            };
          } else {
            return {
              type: FlowOperationType.UPDATE_ACTION as const,
              request: updatedStep as Action,
            };
          }
        };

        applyOperation(createOperation(), () => toast(UNSAVED_CHANGES_TOAST));
      },
      [applyOperation, selectedStep],
    );
  },
};
