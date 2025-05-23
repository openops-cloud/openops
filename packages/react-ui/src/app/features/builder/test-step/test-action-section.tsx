import {
  Button,
  Dot,
  INTERNAL_ERROR_TOAST,
  useToast,
} from '@openops/components/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  FlagId,
  isNil,
  RiskLevel,
  StepRunResponse,
} from '@openops/shared';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { QueryKeys } from '@/app/constants/query-keys';
import { stepTestOutputHooks } from './step-test-output-hooks';
import { TestSampleDataViewer } from './test-sample-data-viewer';
import { TestButtonTooltip } from './test-step-tooltip';
import { testStepUtils } from './test-step-utils';

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
    const queryClient = useQueryClient();

    const [isValid, setIsValid] = useState(false);

    const [riskyStepConfirmationMessage, setRiskyStepConfirmationMessage] =
      useState<RiskyStepConfirmationMessages | null>(null);

    const { selectedStep, selectedStepTemplateModel } =
      useStepSettingsContext();

    useEffect(() => {
      setIsValid(form.formState.isValid);
    }, [form.formState.isValid]);

    const {
      data: testOutputData,
      isLoading: isLoadingTestOutput,
      refetch: refetchTestOutput,
    } = stepTestOutputHooks.useStepTestOutputFormData(flowVersionId, form);

    const sampleDataExists =
      !isNil(testOutputData?.lastTestDate) || !isNil(errorMessage);

    const { data: useNewExternalTestData = false } = flagsHooks.useFlag(
      FlagId.USE_NEW_EXTERNAL_TESTDATA,
    );

    const socket = useSocket();

    const { mutate, isPending } = useMutation<StepRunResponse, Error, void>({
      mutationFn: async () => {
        const response = await flowsApi.testStep(socket, {
          flowVersionId,
          stepName: formValues.name,
        });
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.dataSelectorStepTestOutput],
        });
        return response;
      },
      onSuccess: (stepResponse) => {
        const formattedResponse = formatUtils.formatStepInputOrOutput(
          stepResponse.output,
        );
        if (stepResponse.success) {
          setErrorMessage(undefined);

          if (!useNewExternalTestData) {
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
          }
          refetchTestOutput();
        } else {
          setErrorMessage(testStepUtils.formatErrorMessage(formattedResponse));
        }
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
        currentSelectedData={testOutputData?.output}
        errorMessage={errorMessage}
        lastTestDate={testOutputData?.lastTestDate}
        type={formValues.type}
      />
    );
  },
);
TestActionSection.displayName = 'TestActionSection';

export { TestActionSection };
