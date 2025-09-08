import {
  Button,
  CardList,
  LoadingSpinner,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  SidebarHeader,
  StatusIconWithText,
} from '@openops/components/ui';
import { t } from 'i18next';
import { ChevronLeft, Info } from 'lucide-react';
import React, { useMemo } from 'react';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { FlagId, isNil, RunEnvironment } from '@openops/shared';
import { LeftSideBarType } from '../builder-types';

import { formatUtils } from '@/app/lib/utils';
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
    return run && selectedStep && run.steps
      ? flowRunUtils.extractLoopItemStepOutput(
          selectedStep,
          loopsIndexes,
          run.steps,
          flowVersion.trigger,
        )
      : null;
  }, [run, selectedStep, loopsIndexes, flowVersion.trigger]);

  const message = getRunMessage(run, rententionDays);

  const runStatus = useMemo(() => {
    if (!run) return null;
    const { variant, Icon } = flowRunUtils.getStatusIcon(run.status);
    const statusText = formatUtils.convertEnumToHumanReadable(run.status);
    const explanation = flowRunUtils.getStatusExplanation(run.status);

    return { variant, Icon, statusText, explanation };
  }, [run]);

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

          {runStatus && (
            <div className="text-left">
              <StatusIconWithText
                icon={runStatus.Icon}
                text={runStatus.statusText ?? ''}
                variant={runStatus.variant}
                explanation={runStatus.explanation}
              />
            </div>
          )}
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
