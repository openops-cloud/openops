import {
  Button,
  CardList,
  LoadingSpinner,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  SidebarHeader,
} from '@openops/components/ui';
import { t } from 'i18next';
import { ChevronLeft, Info } from 'lucide-react';
import React, { useMemo } from 'react';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import {
  ActionType,
  FlagId,
  isNil,
  RunEnvironment,
  StepOutput,
} from '@openops/shared';
import { LeftSideBarType } from '../builder-types';

import { useEffectOnce } from 'react-use';
import { flowRunUtils } from '../../flow-runs/lib/flow-run-utils';
import { RUN_DETAILS_STEP_CARD_ID_PREFIX } from './constants';
import { FlowStepDetailsCardItem } from './flow-step-details-card-item';
import { FlowStepInputOutput } from './flow-step-input-output';
import { getRunMessage } from './run-details-helpers';

const FlowRunDetails = React.memo(() => {
  const { data: rententionDays } = flagsHooks.useFlag<number>(
    FlagId.EXECUTION_DATA_RETENTION_DAYS,
  );

  const [
    setLeftSidebar,
    run,
    steps,
    loopsIndexes,
    flowVersion,
    selectedStep,
    selectStepByName,
  ] = useBuilderStateContext((state) => {
    const steps =
      state.run && state.run.steps ? Object.keys(state.run.steps) : [];
    return [
      state.setLeftSidebar,
      state.run,
      steps,
      state.loopsIndexes,
      state.flowVersion,
      state.selectedStep,
      state.selectStepByName,
    ];
  });

  const selectedStepTestData = useMemo(() => {
    const testData =
      run && selectedStep && run.steps
        ? flowRunUtils.extractStepOutput(
            selectedStep,
            loopsIndexes,
            run.steps,
            flowVersion.trigger,
          )
        : null;
    if (
      !testData ||
      testData.type !== ActionType.LOOP_ON_ITEMS ||
      !testData.output?.index ||
      !testData.input ||
      !selectedStep
    ) {
      return testData;
    }
    try {
      return {
        ...testData,
        output: {
          item: (testData.input as { items: any }).items?.[
            loopsIndexes[selectedStep]
          ],
          index: loopsIndexes[selectedStep] + 1,
        },
      } as StepOutput;
    } catch {
      return testData;
    }
  }, [run, selectedStep, loopsIndexes, flowVersion.trigger]);

  const message = getRunMessage(run, rententionDays);

  useEffectOnce(() => {
    if (!run?.steps) return;
    const failedStepInfo = flowRunUtils.findFailedStep(run);

    if (failedStepInfo && selectedStep !== failedStepInfo.stepName) {
      selectStepByName(failedStepInfo.stepName);
      document
        .querySelector(
          `#${RUN_DETAILS_STEP_CARD_ID_PREFIX}-${failedStepInfo.stepName}`,
        )
        ?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  if (!isNil(message))
    return (
      <div className="flex flex-col justify-center items-center gap-4 w-full h-full">
        <Info size={36} className="text-muted-foreground" />
        <h4 className="px-6 text-sm text-center text-muted-foreground ">
          {message}
        </h4>
      </div>
    );

  return (
    <ResizablePanelGroup direction="vertical">
      <SidebarHeader onClose={() => setLeftSidebar(LeftSideBarType.NONE)}>
        <div className="flex gap-2 items-center">
          {run && run.environment !== RunEnvironment.TESTING && (
            <Button
              variant="ghost"
              size={'sm'}
              onClick={() => setLeftSidebar(LeftSideBarType.RUNS)}
            >
              <ChevronLeft size={16} />
            </Button>
          )}
          <span>{t('Run Details')}</span>
        </div>
      </SidebarHeader>
      <ResizablePanel className="h-full">
        <CardList className="p-0 h-full">
          {steps.length > 0 &&
            steps
              .filter((path) => !isNil(path))
              .map((path) => (
                <FlowStepDetailsCardItem
                  stepName={path}
                  depth={0}
                  key={path}
                ></FlowStepDetailsCardItem>
              ))}
          {steps.length === 0 && (
            <div className="w-full h-full flex items-center justify-center">
              <LoadingSpinner></LoadingSpinner>
            </div>
          )}
        </CardList>
      </ResizablePanel>
      {selectedStepTestData && (
        <>
          <ResizableHandle withHandle={true} />
          <ResizablePanel defaultValue={25}>
            <FlowStepInputOutput
              stepDetails={selectedStepTestData}
            ></FlowStepInputOutput>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
});

FlowRunDetails.displayName = 'FlowRunDetails';
export { FlowRunDetails };
