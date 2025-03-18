import { useDraggable } from '@dnd-kit/core';
import {
  BlockIcon,
  Button,
  cn,
  DRAGGED_STEP_TAG,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  InvalidStepIcon,
  LoadingSpinner,
  OPS_NODE_SIZE,
  OverflowTooltip,
  Tooltip,
  TooltipContent,
  UNSAVED_CHANGES_TOAST,
  useToast,
  WorkflowNode,
} from '@openops/components/ui';
import { TooltipTrigger } from '@radix-ui/react-tooltip';
import { Handle, Position } from '@xyflow/react';
import { t } from 'i18next';
import {
  ArrowRightLeft,
  CopyPlus,
  EllipsisVertical,
  Trash,
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';

import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { BlockSelector } from '@/app/features/builder/blocks-selector';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { flowRunUtils } from '@/app/features/flow-runs/lib/flow-run-utils';
import {
  flowHelper,
  FlowOperationType,
  FlowRun,
  FlowRunStatus,
  FlowVersion,
  isNil,
  TriggerType,
} from '@openops/shared';

import { useApplyOperationAndPushToHistory } from '@/app/features/builder/flow-version-undo-redo/hooks/apply-operation-and-push-to-history';

function getStepStatus(
  stepName: string | undefined,
  run: FlowRun | null,
  loopIndexes: Record<string, number>,
  flowVersion: FlowVersion,
) {
  if (!run || !stepName || !run.steps) {
    return undefined;
  }
  const stepOutput = flowRunUtils.extractStepOutput(
    stepName,
    loopIndexes,
    run.steps,
    flowVersion.trigger,
  );
  return stepOutput?.status;
}

const StepActionWrapper = React.memo(
  ({ children }: { children: React.ReactNode }) => {
    return (
      <div className="flex items-center gap-2 cursor-pointer">{children}</div>
    );
  },
);
StepActionWrapper.displayName = 'StepActionWrapper';
const WorkflowStepNode = React.memo(
  ({ data }: { data: WorkflowNode['data'] }) => {
    const { toast } = useToast();
    const [
      selectStepByName,
      setAllowCanvasPanning,
      isSelected,
      isDragging,
      selectedStep,
      run,
      readonly,
      exitStepSettings,
      removeStepSelection,
      flowVersion,
      loopIndexes,
    ] = useBuilderStateContext((state) => [
      state.selectStepByName,
      state.setAllowCanvasPanning,
      state.selectedStep === data.step?.name,
      state.activeDraggingStep === data.step?.name,
      state.selectedStep,
      state.run,
      state.readonly,
      state.exitStepSettings,
      state.removeStepSelection,
      state.flowVersion,
      state.loopsIndexes,
    ]);
    const applyOperationAndPushToHistory = useApplyOperationAndPushToHistory();
    const blockSelectorOperation = useRef<
      FlowOperationType.UPDATE_ACTION | FlowOperationType.UPDATE_TRIGGER
    >(FlowOperationType.UPDATE_ACTION);
    const deleteStep = () => {
      applyOperationAndPushToHistory(
        {
          type: FlowOperationType.DELETE_ACTION,
          request: {
            name: data.step!.name,
          },
        },
        () => toast(UNSAVED_CHANGES_TOAST),
      );
      removeStepSelection();
    };

    const duplicateStep = () =>
      applyOperationAndPushToHistory(
        {
          type: FlowOperationType.DUPLICATE_ACTION,
          request: {
            stepName: data.step!.name,
          },
        },
        () => toast(UNSAVED_CHANGES_TOAST),
      );

    const { stepMetadata } = blocksHooks.useStepMetadata({
      step: data.step!,
    });
    const stepIndex = useMemo(() => {
      const steps = flowHelper.getAllSteps(flowVersion.trigger);
      return steps.findIndex((step) => step.name === data.step!.name) + 1;
    }, [data, flowVersion]);

    const [openStepActionsMenu, setOpenStepActionsMenu] = useState(false);
    const [openBlockSelector, setOpenBlockSelector] = useState(false);

    const isTrigger = flowHelper.isTrigger(data.step!.type);
    const isAction = flowHelper.isAction(data.step!.type);
    const isEmptyTriggerSelected =
      selectedStep === 'trigger' && data.step?.type === TriggerType.EMPTY;

    const { attributes, listeners, setNodeRef } = useDraggable({
      id: data.step!.name,
      disabled: isTrigger || readonly,
      data: {
        type: DRAGGED_STEP_TAG,
      },
    });

    const stepOutputStatus = useMemo(() => {
      return getStepStatus(data.step?.name, run, loopIndexes, flowVersion);
    }, [data.step?.name, run, loopIndexes, flowVersion]);

    const showRunningIcon =
      isNil(stepOutputStatus) && run?.status === FlowRunStatus.RUNNING;
    const statusInfo = isNil(stepOutputStatus)
      ? undefined
      : flowRunUtils.getStatusIconForStep(stepOutputStatus);

    const handleStepClick = (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    ) => {
      const { name } = data.step!;
      selectStepByName(name);
      e.preventDefault();
      e.stopPropagation();
    };

    return (
      <div
        id={data.step!.name}
        style={{
          height: `${OPS_NODE_SIZE.stepNode.height}px`,
          width: `${OPS_NODE_SIZE.stepNode.width}px`,
        }}
        className={cn(
          'transition-all border-box rounded-sm border border-solid  border-border-300 relative hover:border-primary-200 group pointer-events-auto',
          {
            'shadow-step-container': !isDragging,
            'border-primary-200': isSelected,
            'bg-background': !isDragging,
            'border-none': isDragging,
            'shadow-none': isDragging,
          },
        )}
        onClick={(e) => handleStepClick(e)}
        onMouseEnter={() => {
          setAllowCanvasPanning(false);
        }}
        onMouseLeave={() => {
          setAllowCanvasPanning(true);
        }}
        key={data.step?.name}
        ref={setNodeRef}
        {...attributes}
        {...listeners}
      >
        <div
          className="absolute text-accent-foreground text-sm opacity-0 transition-all duration-300 group-hover:opacity-100 "
          style={{
            top: `${OPS_NODE_SIZE.stepNode.height / 2 - 12}px`,
            right: `-${OPS_NODE_SIZE.stepNode.width / 5}px`,
          }}
        >
          {data.step?.name}
        </div>
        <div
          className={cn(
            'absolute left-0 top-0 pointer-events-none  rounded-sm w-full h-full',
            {
              'border-t-[3px] border-primary-200 border-solid':
                isSelected && !isDragging,
            },
          )}
        ></div>
        <div className="h-full w-full overflow-hidden">
          {!isDragging && (
            <BlockSelector
              operation={{
                type: isEmptyTriggerSelected
                  ? FlowOperationType.UPDATE_TRIGGER
                  : blockSelectorOperation.current,
                stepName: data.step!.name!,
              }}
              open={openBlockSelector || (!readonly && isEmptyTriggerSelected)}
              onOpenChange={(open) => {
                setOpenBlockSelector(open);
                if (open) {
                  setOpenStepActionsMenu(false);
                } else if (data.step?.type === TriggerType.EMPTY) {
                  exitStepSettings();
                }
              }}
              asChild={true}
            >
              <div
                className="h-full w-full pl-4 pr-2 py-[10px] flex flex-col justify-between"
                onClick={(e) => {
                  if (!openBlockSelector) {
                    handleStepClick(e);
                  }
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-1 items-center gap-[6px]">
                    <BlockIcon
                      logoUrl={stepMetadata?.logoUrl}
                      displayName={stepMetadata?.displayName}
                      showTooltip={false}
                      size={'sm'}
                    ></BlockIcon>
                    <div className="text-xs truncate text-muted-foreground text-ellipsis overflow-hidden whitespace-nowrap w-full">
                      {stepMetadata?.displayName}
                    </div>
                  </div>

                  {!readonly && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <DropdownMenu
                        open={openStepActionsMenu}
                        onOpenChange={(open) => {
                          setOpenStepActionsMenu(open);
                        }}
                        modal={true}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 size-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                          >
                            <EllipsisVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="w-44 absolute"
                          onCloseAutoFocus={(e) => e.preventDefault()}
                        >
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              blockSelectorOperation.current = isAction
                                ? FlowOperationType.UPDATE_ACTION
                                : FlowOperationType.UPDATE_TRIGGER;
                              setOpenStepActionsMenu(false);
                              setOpenBlockSelector(true);
                              selectStepByName(data.step!.name!);
                            }}
                          >
                            <StepActionWrapper>
                              <ArrowRightLeft className=" h-4 w-4 " />
                              <span>Replace</span>
                            </StepActionWrapper>
                          </DropdownMenuItem>

                          {isAction && (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                duplicateStep();
                                setOpenStepActionsMenu(false);
                              }}
                            >
                              <StepActionWrapper>
                                <CopyPlus className="h-4 w-4" />
                                {t('Duplicate')}
                              </StepActionWrapper>
                            </DropdownMenuItem>
                          )}

                          {isAction && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  deleteStep();
                                  setOpenStepActionsMenu(false);
                                  setAllowCanvasPanning(true);
                                }}
                              >
                                <StepActionWrapper>
                                  <Trash className="mr-2 h-4 w-4 text-destructive" />
                                  <span className="text-destructive">
                                    Delete
                                  </span>
                                </StepActionWrapper>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                <div className="flex justify-between gap-[6px] w-full items-center">
                  <OverflowTooltip
                    text={`${stepIndex}. ${data.step?.displayName}`}
                  />

                  <div className="w-4 ml-1 flex items-center justify-center ">
                    {statusInfo &&
                      React.createElement(statusInfo.Icon, {
                        className: cn('w-4 h-4', {
                          'text-success-300': statusInfo.variant === 'success',
                          'text-destructive-300':
                            statusInfo.variant === 'error',
                        }),
                      })}
                    {showRunningIcon && (
                      <LoadingSpinner className="w-4 h-4 text-primary"></LoadingSpinner>
                    )}
                    {!data.step?.valid && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="mr-2">
                            <InvalidStepIcon
                              size={16}
                              viewBox="0 0 16 16"
                              className="stroke-0 animate-fade"
                            ></InvalidStepIcon>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {t('Incomplete settings')}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            </BlockSelector>
          )}

          <Handle
            type="source"
            style={{ opacity: 0 }}
            position={Position.Bottom}
          />
          <Handle
            type="target"
            position={Position.Top}
            style={{ opacity: 0 }}
          />
        </div>
      </div>
    );
  },
);

WorkflowStepNode.displayName = 'WorkflowStepNode';
export { WorkflowStepNode };
