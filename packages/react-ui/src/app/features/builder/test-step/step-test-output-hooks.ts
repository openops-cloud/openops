import { QueryKeys } from '@/app/constants/query-keys';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { useStepSettingsContext } from '@/app/features/builder/step-settings/step-settings-context';
import { toast, UNSAVED_CHANGES_TOAST } from '@openops/components/ui';
import {
  Action,
  flowHelper,
  FlowOperationType,
  Trigger,
} from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
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

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return stepTestOutputHooks.useStepTestOutput(flowVersionId, stepId!);
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
