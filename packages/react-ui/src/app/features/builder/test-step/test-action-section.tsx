import {
  Button,
  Dot,
  INTERNAL_ERROR_TOAST,
  useToast,
} from '@openops/components/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useSocket } from '@/app/common/providers/socket-provider';
import { useStepSettingsContext } from '@/app/features/builder/step-settings/step-settings-context';
import { TestRiskyStepConfirmation } from '@/app/features/builder/test-step/test-risky-step-confirmation';
import {
  getRiskyStepConfirmationMessagesForAction,
  RiskyStepConfirmationMessages,
} from '@/app/features/builder/test-step/test-risky-step-confirmation-messages';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { formatUtils } from '@/app/lib/utils';
import {
  Action,
  ActionType,
  isNil,
  RiskLevel,
  StepRunResponse,
} from '@openops/shared';
import {
  setStepOutputCache,
  stepTestOutputCache,
} from '../data-selector/data-selector-cache';
import { stepTestOutputHooks } from './step-test-output-hooks';
import { TestSampleDataViewer } from './test-sample-data-viewer';
import { TestButtonTooltip } from './test-step-tooltip';

type TestActionComponentProps = {
  isSaving: boolean;
  flowVersionId: string;
  onTestCallback: () => void;
  readOnly: boolean;
};

const TestActionSection = React.memo(
  ({
    isSaving,
    flowVersionId,
    onTestCallback,
    readOnly,
  }: TestActionComponentProps) => {
    const { toast } = useToast();
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
      undefined,
    );
    const form = useFormContext<Action>();
    const formValues = form.getValues();
    const queryClient = useQueryClient();

    const [isValid, setIsValid] = useState(false);

    const [riskyStepConfirmationMessage, setRiskyStepConfirmationMessage] =
      useState<RiskyStepConfirmationMessages | null>(null);

    const { selectedStep, selectedStepTemplateModel } =
      useStepSettingsContext();

    useEffect(() => {
      setIsValid(form.formState.isValid);
    }, [form.formState.isValid]);

    const { data: stepData, isLoading: isLoadingStepData } =
      stepTestOutputHooks.useStepTestOutputFormData(flowVersionId, form);

    const sampleDataExists =
      !isNil(stepData?.lastTestDate) || !isNil(errorMessage);

    const socket = useSocket();

    useEffect(() => {
      if (stepData?.success === false) {
        setErrorMessage(
          formatUtils.formatStepInputOrOutput(stepData.output) ??
            t('Unknow Error'),
        );
      } else {
        setErrorMessage(undefined);
      }
    }, [stepData]);

    const { mutate, isPending } = useMutation<StepRunResponse, Error, void>({
      mutationFn: async () => {
        onTestCallback();
        const response = await flowsApi.testStep(socket, {
          flowVersionId,
          stepName: formValues.name,
        });
        return response;
      },
      onSuccess: (stepResponse) => {
        setStepOutputCache({
          stepId: formValues.id,
          flowVersionId,
          output: stepResponse.output,
          input: stepResponse.input,
          queryClient,
          success: stepResponse.success,
        });
      },
      onError: (error) => {
        console.error(error);
        toast(INTERNAL_ERROR_TOAST);
      },
    });

    const isTesting = isPending ?? isLoadingStepData;

    const handleTest = () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      stepTestOutputCache.resetExpandedForStep(formValues.id);
      if (
        selectedStep.type === ActionType.BLOCK &&
        selectedStepTemplateModel?.riskLevel === RiskLevel.HIGH
      ) {
        setRiskyStepConfirmationMessage(
          getRiskyStepConfirmationMessagesForAction(selectedStep),
        );
      } else {
        mutate();
      }
    };

    const confirmRiskyStep = () => {
      setRiskyStepConfirmationMessage(null);
      stepTestOutputCache.resetExpandedForStep(formValues.id);
      mutate();
    };

    if (riskyStepConfirmationMessage) {
      return (
        <TestRiskyStepConfirmation
          onConfirm={confirmRiskyStep}
          onCancel={() => setRiskyStepConfirmationMessage(null)}
          confirmationMessage={riskyStepConfirmationMessage}
        />
      );
    }

    if (!sampleDataExists) {
      return (
        <div className="flex justify-center items-start w-full h-full">
          <TestButtonTooltip disabled={!isValid} aria-label="Test Step Button">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              keyboardShortcut="G"
              onKeyboardShortcut={readOnly ? undefined : mutate}
              loading={isTesting}
              disabled={!isValid || readOnly}
            >
              <Dot animation={true} variant={'primary'} />
              {t('Test Step')}
            </Button>
          </TestButtonTooltip>
        </div>
      );
    }

    return (
      <TestSampleDataViewer
        onRetest={handleTest}
        isValid={isValid}
        isSaving={isSaving}
        isTesting={isTesting}
        outputData={stepData?.output}
        inputData={stepData?.input}
        errorMessage={errorMessage}
        lastTestDate={stepData?.lastTestDate}
        readOnly={readOnly}
      />
    );
  },
);
TestActionSection.displayName = 'TestActionSection';

export { TestActionSection };
