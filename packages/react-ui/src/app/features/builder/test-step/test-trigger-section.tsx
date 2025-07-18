import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dot,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openops/components/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import deepEqual from 'fast-deep-equal';
import { t } from 'i18next';
import { AlertCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { QueryKeys } from '@/app/constants/query-keys';
import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { triggerEventsApi } from '@/app/features/flows/lib/trigger-events-api';
import { formatUtils } from '@/app/lib/utils';
import {
  CATCH_WEBHOOK,
  isNil,
  SeekPage,
  Trigger,
  TriggerEvent,
  TriggerTestStrategy,
} from '@openops/shared';

import {
  setStepOutputCache,
  stepTestOutputCache,
} from '../data-selector/data-selector-cache';
import { stepTestOutputHooks } from './step-test-output-hooks';
import { TestSampleDataViewer } from './test-sample-data-viewer';
import { TestButtonTooltip } from './test-step-tooltip';
import { testStepUtils } from './test-step-utils';

const waitFor2Seconds = () =>
  new Promise((resolve) => setTimeout(resolve, 2000));
type TestTriggerSectionProps = {
  isSaving: boolean;
  flowVersionId: string;
  flowId: string;
};

function getSelectedId(testOutput: unknown, pollResults: TriggerEvent[]) {
  if (testOutput === undefined) {
    return undefined;
  }
  for (let i = 0; i < pollResults.length; i++) {
    if (deepEqual(testOutput, pollResults[i].payload)) {
      return pollResults[i].id;
    }
  }
  return undefined;
}

const TestTriggerSection = React.memo(
  ({ isSaving, flowVersionId, flowId }: TestTriggerSectionProps) => {
    const form = useFormContext<Trigger>();
    const formValues = form.getValues();
    const [isValid, setIsValid] = useState(false);

    const { blockModel, isLoading: isBlockLoading } = blocksHooks.useBlock({
      name: formValues.settings.blockName,
      version: formValues.settings.blockVersion,
    });
    const queryClient = useQueryClient();

    const isSimulation =
      blockModel?.triggers?.[formValues.settings.triggerName]?.testStrategy ===
      TriggerTestStrategy.SIMULATION;
    const mockData =
      blockModel?.triggers?.[formValues.settings.triggerName].sampleData;
    useEffect(() => {
      setIsValid(form.formState.isValid);
    }, [form.formState.isValid]);

    const [errorMessage, setErrorMessage] = useState<string | undefined>(
      undefined,
    );

    const { data: stepData, isLoading: isLoadingStepData } =
      stepTestOutputHooks.useStepTestOutputFormData(flowVersionId, form);

    const [currentSelectedId, setCurrentSelectedId] = useState<
      string | undefined
    >(undefined);
    const { mutate: saveMockAsSampleData, isPending: isSavingMockdata } =
      useMutation({
        mutationFn: () => {
          return triggerEventsApi.saveTriggerMockdata(flowId, mockData);
        },
        onSuccess: async (result) => {
          updateSelectedData(result);
        },
      });
    const {
      mutate: simulateTrigger,
      isPending: isSimulating,
      reset: resetSimulation,
    } = useMutation<TriggerEvent[], Error, void>({
      mutationFn: async () => {
        setErrorMessage(undefined);
        const ids = (
          await triggerEventsApi.list({ flowId, cursor: undefined, limit: 5 })
        ).data.map((triggerEvent) => triggerEvent.id);
        await triggerEventsApi.startWebhookSimulation(flowId);
        let attempt = 0;
        while (attempt < 1000) {
          const newData = await triggerEventsApi.list({
            flowId,
            cursor: undefined,
            limit: 5,
          });
          const newIds = newData.data.map((triggerEvent) => triggerEvent.id);
          if (!deepEqual(ids, newIds)) {
            return newData.data;
          }
          await waitFor2Seconds();
          attempt++;
        }
        return [];
      },
      onSuccess: async (results) => {
        if (results.length > 0) {
          const lastResult = results[results.length - 1];
          updateSelectedData(lastResult);

          await triggerEventsApi.deleteWebhookSimulation(flowId);
        }
      },
      onError: async (error) => {
        console.error(error);
        await triggerEventsApi.deleteWebhookSimulation(flowId);
        setErrorMessage(
          testStepUtils.formatErrorMessage(
            t('There is no sample data available found for this trigger.'),
          ),
        );
      },
    });

    const { mutate: pollTrigger, isPending } = useMutation<
      SeekPage<TriggerEvent>,
      Error,
      void
    >({
      mutationFn: async () => {
        setErrorMessage(undefined);
        return triggerEventsApi.pollTrigger({
          flowId,
        });
      },
      onSuccess: (results) => {
        if (results.data.length > 0) {
          updateSelectedData(results.data[0]);
          refetch();
        }
      },
      onError: (error) => {
        console.error(error);
        setErrorMessage(
          testStepUtils.formatErrorMessage(
            t('Failed to run test step, please ensure settings are correct.'),
          ),
        );
      },
    });

    const isTesting = isPending ?? isLoadingStepData;

    function updateSelectedData(data: TriggerEvent) {
      stepTestOutputCache.setStepData(formValues.id, {
        output: formatUtils.formatStepInputOrOutput(data.payload),
        lastTestDate: dayjs().toISOString(),
      });
      setStepOutputCache({
        stepId: formValues.id,
        flowVersionId,
        output: data.payload,
        input: data.input,
        queryClient,
      });
    }

    const { data: pollResults, refetch } = useQuery<SeekPage<TriggerEvent>>({
      queryKey: [QueryKeys.triggerEvents, flowVersionId],
      queryFn: () =>
        triggerEventsApi.list({
          flowId: flowId,
          limit: 5,
          cursor: undefined,
        }),
      staleTime: 0,
    });

    const currentTestOutput = stepData?.output;
    const currentTestInput = stepData?.input;

    const outputDataSelected =
      !isNil(currentTestOutput) || !isNil(errorMessage);

    const isTestedBefore = !isNil(stepData?.lastTestDate);

    useEffect(() => {
      const selectedId = getSelectedId(
        currentTestOutput,
        pollResults?.data ?? [],
      );
      setCurrentSelectedId(selectedId);
    }, [currentTestOutput, pollResults]);

    useEffect(() => {
      setErrorMessage(undefined);
    }, [currentTestOutput]);

    if (isBlockLoading) {
      return null;
    }

    const testTriggerNote =
      formValues.settings.triggerName === CATCH_WEBHOOK
        ? t('Please click on Test URL to generate sample data')
        : t('Please go to {blockName} and trigger {triggerName}.', {
            blockName: blockModel?.displayName,
            triggerName:
              blockModel?.triggers[formValues.settings.triggerName].displayName,
          });

    return (
      <div className="flex flex-col h-full">
        {outputDataSelected && !isSimulating && !isSavingMockdata && (
          <>
            {pollResults?.data && !isTesting && (
              <div className="mb-3">
                <Select
                  value={currentSelectedId}
                  onValueChange={(value) => {
                    const triggerEvent = pollResults?.data.find(
                      (triggerEvent) => triggerEvent.id === value,
                    );
                    if (triggerEvent) {
                      updateSelectedData(triggerEvent);
                      setCurrentSelectedId(value);
                    }
                  }}
                >
                  <SelectTrigger
                    className="w-full"
                    disabled={pollResults && pollResults.data.length === 0}
                  >
                    {pollResults && pollResults.data.length > 0 ? (
                      <SelectValue
                        placeholder={t('No sample data available')}
                      ></SelectValue>
                    ) : (
                      t('Old results were removed, retest for new sample data')
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {pollResults &&
                      pollResults.data.map((triggerEvent, index) => (
                        <SelectItem
                          key={triggerEvent.id}
                          value={triggerEvent.id}
                        >
                          {t('Result #') + (index + 1)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <span className="text-sm mt-2 text-muted-foreground">
                  {t('The sample data can be used in the next steps.')}
                </span>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <TestSampleDataViewer
                onRetest={isSimulation ? simulateTrigger : pollTrigger}
                isValid={isValid}
                isSaving={isSaving}
                isTesting={isTesting}
                outputData={currentTestOutput}
                inputData={currentTestInput}
                errorMessage={errorMessage}
                lastTestDate={stepData?.lastTestDate}
              />
            </div>
          </>
        )}

        {isSimulation && isSimulating && (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex gap-2 items-center justify-center w-full">
              <LoadingSpinner className="w-4 h-4"></LoadingSpinner>
              <div>{t('Testing Trigger')}</div>
              <div className="flex-grow"></div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetSimulation();
                }}
              >
                {' '}
                {t('Cancel')}{' '}
              </Button>
            </div>
            <Alert className="bg-warning/5 border-warning/5 ">
              <AlertCircle className="h-4 w-4 text-warning" />
              <div className="flex flex-col gap-1">
                <AlertTitle>{t('Action Required')}:</AlertTitle>
                <AlertDescription>{testTriggerNote}</AlertDescription>
              </div>
            </Alert>
          </div>
        )}
        {!isTestedBefore &&
          !outputDataSelected &&
          isSimulation &&
          !isSimulating && (
            <div className="flex justify-center flex-col gap-2 items-center">
              <TestButtonTooltip disabled={!isValid}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateTrigger()}
                  keyboardShortcut="G"
                  onKeyboardShortcut={simulateTrigger}
                  disabled={!isValid}
                >
                  <Dot animation={true} variant={'primary'}></Dot>
                  {t('Test Trigger')}
                </Button>
              </TestButtonTooltip>

              {!isNil(mockData) && (
                <>
                  {t('Or')}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveMockAsSampleData()}
                    loading={isSavingMockdata}
                  >
                    {t('Use Mock Data')}
                  </Button>
                </>
              )}
            </div>
          )}
        {!isTestedBefore && !outputDataSelected && !isSimulation && (
          <div className="flex justify-center">
            <TestButtonTooltip disabled={!isValid}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pollTrigger()}
                keyboardShortcut="G"
                onKeyboardShortcut={pollTrigger}
                loading={isTesting}
                disabled={!isValid}
              >
                <Dot animation={true} variant={'primary'}></Dot>
                {t('Load Data')}
              </Button>
            </TestButtonTooltip>
          </div>
        )}
      </div>
    );
  },
);
TestTriggerSection.displayName = 'TestTriggerSection';

export { TestTriggerSection };
