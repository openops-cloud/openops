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
  FlagId,
  FlowRun,
  FlowRunStatus,
  isNil,
  RunEnvironment,
} from '@openops/shared';
import { LeftSideBarType } from '../builder-types';

import { flowRunUtils } from '../../flow-runs/lib/flow-run-utils';
import { FlowStepDetailsCardItem } from './flow-step-details-card-item';
import { FlowStepInputOutput } from './flow-step-input-output';

function getMessage(run: FlowRun | null, retentionDays: number | null) {
  if (
    !run ||
    run.status === FlowRunStatus.RUNNING ||
    run.status === FlowRunStatus.SCHEDULED
  )
    return null;
  if (
    [FlowRunStatus.INTERNAL_ERROR, FlowRunStatus.TIMEOUT].includes(run.status)
  ) {
    return t('There are no logs captured for this run.');
  }
  if (isNil(run.logsFileId)) {
    return t(
      'Logs are kept for {days} days after execution and then deleted.',
      { days: retentionDays },
    );
  }
  return null;
}

const FlowRunDetails = React.memo(() => {
  const { data: rententionDays } = flagsHooks.useFlag<number>(
    FlagId.EXECUTION_DATA_RETENTION_DAYS,
  );

  const [setLeftSidebar, run, steps, loopsIndexes, flowVersion, selectedStep] =
    useBuilderStateContext((state) => {
      const steps =
        state.run && state.run.steps ? Object.keys(state.run.steps) : [];
      return [
        state.setLeftSidebar,
        state.run,
        steps,
        state.loopsIndexes,
        state.flowVersion,
        state.selectedStep,
      ];
    });

  const selectedStepOutput = useMemo(() => {
    return run && selectedStep && run.steps
      ? flowRunUtils.extractStepOutput(
          selectedStep,
          loopsIndexes,
          run.steps,
          flowVersion.trigger,
        )
      : null;
  }, [run, selectedStep, loopsIndexes, flowVersion.trigger]);

  const message = getMessage(run, rententionDays);

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
      {selectedStepOutput && (
        <>
          <ResizableHandle withHandle={true} />
          <ResizablePanel defaultValue={25}>
            <FlowStepInputOutput
              stepDetails={selectedStepOutput}
            ></FlowStepInputOutput>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
});

FlowRunDetails.displayName = 'FlowRunDetails';
export { FlowRunDetails };
