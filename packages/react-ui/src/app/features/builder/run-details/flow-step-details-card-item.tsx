import {
  Button,
  CardListItem,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  cn,
} from '@openops/components/ui';
import { ChevronRight } from 'lucide-react';
import React, { useMemo } from 'react';

import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { flowRunUtils } from '@/app/features/flow-runs/lib/flow-run-utils';
import { formatUtils } from '@/app/lib/utils';
import { ActionType, FlagId, flowHelper } from '@openops/shared';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { StepStatusIcon } from '@/app/features/flow-runs/components/step-status-icon';
import { LoopIterationInput } from './loop-iteration-input';

type FlowStepDetailsCardProps = {
  stepName: string;
  depth: number;
};

const FlowStepDetailsCardItem = ({
  stepName,
  depth,
}: FlowStepDetailsCardProps) => {
  const durationEnabled = flagsHooks.useFlag<boolean>(
    FlagId.SHOW_DURATION,
  ).data;

  const [
    loopsIndexes,
    step,
    selectedStep,
    stepIndex,
    selectStepByName,
    run,
    flowVersion,
  ] = useBuilderStateContext((state) => {
    const step = flowHelper.getStep(state.flowVersion, stepName);
    const stepIndex = flowHelper
      .getAllSteps(state.flowVersion.trigger)
      .findIndex((s) => s.name === stepName);

    return [
      state.loopsIndexes,
      step,
      state.selectedStep,
      stepIndex,
      state.selectStepByName,
      state.run,
      state.flowVersion,
    ];
  });

  const isChildSelected = useMemo(() => {
    return step?.type === ActionType.LOOP_ON_ITEMS && selectedStep
      ? flowHelper.isChildOf(step, selectedStep)
      : false;
  }, [step, selectedStep]);

  const stepOutput = useMemo(() => {
    return run && run.steps
      ? flowRunUtils.extractStepOutput(
          stepName,
          loopsIndexes,
          run.steps,
          flowVersion.trigger,
        )
      : null;
  }, [loopsIndexes, run, stepName, flowVersion.trigger]);

  const isStepSelected = selectedStep === stepName;

  const children =
    stepOutput &&
    stepOutput.output &&
    stepOutput.type === ActionType.LOOP_ON_ITEMS &&
    stepOutput.output.iterations[loopsIndexes[stepName]]
      ? Object.keys(stepOutput.output.iterations[loopsIndexes[stepName]])
      : [];

  const { stepMetadata } = blocksHooks.useStepMetadata({
    step: step,
  });
  const [isOpen, setIsOpen] = React.useState(true);

  const isLoopStep = stepOutput && stepOutput.type === ActionType.LOOP_ON_ITEMS;

  return (
    <Collapsible open={isOpen} className="w-full">
      <CollapsibleTrigger asChild={true}>
        <CardListItem
          onClick={() => {
            if (!isStepSelected) {
              selectStepByName(stepName);
              setIsOpen(true);
            } else {
              setIsOpen(!isOpen);
            }
          }}
          className={cn('cursor-pointer select-none px-4 py-3 h-14', {
            'bg-accent text-accent-foreground': isStepSelected,
          })}
        >
          <div
            style={{
              minWidth: `${depth * 25}px`,
              display: depth === 0 ? 'none' : 'flex',
            }}
          ></div>
          <div className="flex items-center  w-full gap-3">
            {children.length > 0 && (
              <Button
                variant="ghost"
                size={'icon'}
                className="w-4 h-4"
                onClick={(e) => {
                  setIsOpen(!isOpen);
                  e.stopPropagation();
                }}
              >
                <ChevronRight
                  size={16}
                  className={cn('', { 'rotate-90': isOpen })}
                />
              </Button>
            )}
            <img className="w-6 h-6" alt={'logo'} src={stepMetadata?.logoUrl} />
            <div className="break-all truncate">{`${stepIndex + 1}. ${
              step?.displayName
            }`}</div>
            <div className="w-2"></div>
            <div className="flex gap-1 justify-end  items-center flex-grow">
              {isLoopStep && (
                <div
                  className={cn(
                    'flex gap-1 justify-end  items-center flex-grow',
                    { 'mr-4': !isStepSelected && !isChildSelected },
                  )}
                >
                  <LoopIterationInput
                    stepName={stepName}
                    isStepSelected={isStepSelected || isChildSelected}
                  />
                </div>
              )}
              {(!isLoopStep ||
                (isLoopStep && !isChildSelected && !isStepSelected)) && (
                <div className="flex gap-1 animate-fade">
                  {durationEnabled && (
                    <span className="text-muted-foreground text-xs break-normal whitespace-nowrap">
                      {formatUtils.formatDuration(
                        stepOutput?.duration ?? 0,
                        true,
                      )}
                    </span>
                  )}

                  {stepOutput && stepOutput.status && (
                    <StepStatusIcon
                      status={stepOutput.status}
                      size="4"
                    ></StepStatusIcon>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardListItem>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-0">
        {children.map((stepName) => (
          <FlowStepDetailsCardItem
            stepName={stepName}
            key={stepName}
            depth={depth + 1}
          ></FlowStepDetailsCardItem>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

FlowStepDetailsCardItem.displayName = 'FlowStepDetailsCard';
export { FlowStepDetailsCardItem };
