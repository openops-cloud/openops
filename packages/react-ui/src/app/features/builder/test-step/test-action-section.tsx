import {
  Button,
  Dot,
  INTERNAL_ERROR_TOAST,
  useToast,
} from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
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

import { TestSampleDataViewer } from './test-sample-data-viewer';
import { TestButtonTooltip } from './test-step-tooltip';
import { testStepUtils } from './test-step-utils';
import { useStepTestOuput } from './use-step-test-output';

type TestActionComponentProps = {
  isSaving: boolean;
  flowVersionId: string;
};

const TestActionSection = React.memo(
  ({ isSaving, flowVersionId }: TestActionComponentProps) => {
    const { toast } = useToast();
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
      undefined,
    );
    const form = useFormContext<Action>();
    const formValues = form.getValues();

    const [isValid, setIsValid] = useState(false);

    const [riskyStepConfirmationMessage, setRiskyStepConfirmationMessage] =
      useState<RiskyStepConfirmationMessages | null>(null);

    const { selectedStep, selectedStepTemplateModel } =
      useStepSettingsContext();

    useEffect(() => {
      setIsValid(form.formState.isValid);
    }, [form.formState.isValid]);

    const [lastTestDate, setLastTestDate] = useState(
      formValues.settings.inputUiInfo?.lastTestDate,
    );

    const { data: currentSelectedData, isLoading: isLoadingTestOutput } =
      useStepTestOuput(flowVersionId, form);

    const sampleDataExists = !isNil(lastTestDate) || !isNil(errorMessage);

    const socket = useSocket();

    const { mutate, isPending } = useMutation<StepRunResponse, Error, void>({
      mutationFn: async () => {
        return flowsApi.testStep(socket, {
          flowVersionId,
          stepName: formValues.name,
        });
      },
      onSuccess: (stepResponse) => {
        const formattedResponse = formatUtils.formatStepInputOrOutput(
          stepResponse.output,
        );
        if (stepResponse.success) {
          setErrorMessage(undefined);

          form.setValue(
            'settings.inputUiInfo.currentSelectedData',
            formattedResponse,
            { shouldValidate: true },
          );
          form.setValue(
            'settings.inputUiInfo.lastTestDate',
            dayjs().toISOString(),
            { shouldValidate: true },
          );
        } else {
          setErrorMessage(testStepUtils.formatErrorMessage(formattedResponse));
        }

        setLastTestDate(dayjs().toISOString());
      },
      onError: (error) => {
        console.error(error);
        toast(INTERNAL_ERROR_TOAST);
      },
    });

    const isTesting = isPending || isLoadingTestOutput;

    const handleTest = () => {
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
        <div className="flex-grow flex justify-center items-center w-full h-full">
          <TestButtonTooltip disabled={!isValid} aria-label="Test Step Button">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              keyboardShortcut="G"
              onKeyboardShortcut={mutate}
              loading={isTesting}
              disabled={!isValid}
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
        currentSelectedData={currentSelectedData}
        errorMessage={errorMessage}
        lastTestDate={lastTestDate}
        type={formValues.type}
      />
    );
  },
);
TestActionSection.displayName = 'TestActionSection';

export { TestActionSection };
