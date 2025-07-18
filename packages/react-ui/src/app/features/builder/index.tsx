import {
  BuilderTreeViewProvider,
  CanvasControls,
  cn,
  ReadonlyCanvasProvider,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@openops/components/ui';
import { ReactFlowProvider } from '@xyflow/react';
import React, {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ImperativePanelHandle } from 'react-resizable-panels';
import { useSearchParams } from 'react-router-dom';
import { useMeasure } from 'react-use';

import {
  useBuilderStateContext,
  useSwitchToDraft,
} from '@/app/features/builder/builder-hooks';
import { DynamicFormValidationProvider } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';
import { useRefreshBlock } from '@/app/features/builder/hooks/use-refresh-block';
import { useRunProgress } from '@/app/features/builder/hooks/use-run-progress';

import { useResizablePanelGroup } from '@/app/common/hooks/use-resizable-panel-group';
import { useSocket } from '@/app/common/providers/socket-provider';
import { PanelSizes } from '@/app/common/types/panel-sizes';
import { FLOW_CANVAS_Y_OFFESET } from '@/app/constants/flow-canvas';
import { SEARCH_PARAMS } from '@/app/constants/search-params';
import { AiAssistantButton } from '@/app/features/ai/ai-assistant-button';
import {
  Action,
  ActionType,
  BlockTrigger,
  flowHelper,
  isNil,
  Trigger,
  TriggerType,
  WebsocketClientEvent,
} from '@openops/shared';

import {
  RESIZABLE_PANEL_GROUP,
  RESIZABLE_PANEL_IDS,
} from '../../constants/layout';
import {
  LEFT_SIDEBAR_MIN_EFFECTIVE_WIDTH,
  LEFT_SIDEBAR_MIN_SIZE,
} from '../../constants/sidebar';
import { AiAssistantChat } from '../ai/ai-assistant-chat';
import { blocksHooks } from '../blocks/lib/blocks-hook';
import { RunDetailsBar } from '../flow-runs/components/run-details-bar';
import { FlowSideMenu } from '../navigation/side-menu/flow/flow-side-menu';
import LeftSidebarResizablePanel from '../navigation/side-menu/left-sidebar';
import { BuilderHeader } from './builder-header/builder-header';
import { LeftSideBarType, RightSideBarType } from './builder-types';
import { FlowBuilderCanvas } from './flow-canvas/flow-builder-canvas';
import { FLOW_CANVAS_CONTAINER_ID } from './flow-version-undo-redo/constants';
import { UndoRedo } from './flow-version-undo-redo/undo-redo';
import { FlowVersionsList } from './flow-versions';
import { InteractiveBuilder } from './interactive-builder';
import { FlowRunDetails } from './run-details';
import { FlowRecentRunsList } from './run-list';
import { StepSettingsContainer } from './step-settings';
import { StepSettingsProvider } from './step-settings/step-settings-context';
import { TreeView } from './tree-view';

const minWidthOfSidebar = 'min-w-[max(20vw,400px)]';

const MIDDLE_PANEL_TOP_OFFSET = 60;

const useAnimateSidebar = (
  sidebarValue: LeftSideBarType | RightSideBarType,
) => {
  const handleRef = useRef<ImperativePanelHandle>(null);

  const sidebarbarClosed = [
    LeftSideBarType.NONE,
    RightSideBarType.NONE,
  ].includes(sidebarValue);

  useEffect(() => {
    requestAnimationFrame(() => {
      try {
        const size = handleRef.current?.getSize?.() ?? 0;
        if (sidebarbarClosed) {
          handleRef.current?.resize?.(0);
        } else if (size === 0) {
          handleRef.current?.resize?.(25);
        }
      } catch (err) {
        console.warn('Sidebar update skipped', err);
      }
    });
  }, [sidebarValue, sidebarbarClosed]);

  return handleRef;
};

const constructContainerKey = (
  flowVersionId: string,
  stepName: string,
  stepType: string,
  triggerOrActionName?: string,
) => {
  return flowVersionId + stepName + stepType + (triggerOrActionName ?? '');
};

const BuilderPage = () => {
  const [searchParams] = useSearchParams();

  const [
    selectedStep,
    leftSidebar,
    setLeftSidebar,
    rightSidebar,
    run,
    canExitRun,
    readonly,
    setReadOnly,
    exitStepSettings,
    flowVersion,
    setRun,
  ] = useBuilderStateContext((state) => [
    state.selectedStep,
    state.leftSidebar,
    state.setLeftSidebar,
    state.rightSidebar,
    state.run,
    state.canExitRun,
    state.readonly,
    state.setReadOnly,
    state.exitStepSettings,
    state.flowVersion,
    state.setRun,
  ]);

  const clearSelectedStep = useCallback(() => {
    exitStepSettings();
  }, [exitStepSettings]);

  const { memorizedSelectedStep, containerKey } = useBuilderStateContext(
    (state) => {
      const flowVersion = state.flowVersion;
      if (
        isNil(state.selectedStep) ||
        state.selectedStep === '' ||
        isNil(flowVersion)
      ) {
        return {
          memorizedSelectedStep: undefined,
          containerKey: undefined,
        };
      }
      const step = flowHelper.getStep(flowVersion, state.selectedStep);
      const triggerOrActionName =
        step?.type === TriggerType.BLOCK
          ? (step as BlockTrigger).settings.triggerName
          : step?.settings.actionName;
      return {
        memorizedSelectedStep: step,
        containerKey: constructContainerKey(
          flowVersion.id,
          state.selectedStep,
          step?.type || '',
          triggerOrActionName,
        ),
      };
    },
  );
  const [middlePanelRef, rawMiddlePanelSize] = useMeasure<HTMLDivElement>();
  const [leftSidePanelRef, leftSidePanelSize] = useMeasure<HTMLDivElement>();
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const rightHandleRef = useAnimateSidebar(rightSidebar);
  const {
    blockModel,
    isLoading: isBlockLoading,
    refetch: refetchBlock,
  } = blocksHooks.useBlock({
    name: memorizedSelectedStep?.settings.blockName,
    version: memorizedSelectedStep?.settings.blockVersion,
    enabled:
      memorizedSelectedStep?.type === ActionType.BLOCK ||
      memorizedSelectedStep?.type === TriggerType.BLOCK,
  });

  const socket = useSocket();

  useRunProgress({
    run,
    setRun,
    flowVersion,
  });

  useRefreshBlock({
    refetchBlock,
  });

  useEffect(() => {
    const viewOnlyParam = searchParams.get(SEARCH_PARAMS.viewOnly) === 'true';

    if (!run && readonly !== viewOnlyParam) {
      if (!readonly && viewOnlyParam) {
        setLeftSidebar(LeftSideBarType.MENU);
      }
      setReadOnly(viewOnlyParam);
    }
  }, [readonly, run, searchParams, setLeftSidebar, setReadOnly]);

  const { switchToDraft, isSwitchingToDraftPending } = useSwitchToDraft();

  const { setPanelGroupSize } = useResizablePanelGroup();

  const isRightSidebarVisible =
    rightSidebar === RightSideBarType.BLOCK_SETTINGS &&
    !!memorizedSelectedStep &&
    memorizedSelectedStep.type !== TriggerType.EMPTY &&
    !isBlockLoading;

  const middlePanelSize = useMemo(() => {
    return {
      width: rawMiddlePanelSize.width,
      height: rawMiddlePanelSize.height - MIDDLE_PANEL_TOP_OFFSET,
    };
  }, [rawMiddlePanelSize.height, rawMiddlePanelSize.width]);

  return (
    <div className="flex h-screen w-screen flex-col relative">
      {run && (
        <RunDetailsBar
          canExitRun={canExitRun}
          run={run}
          isLoading={isSwitchingToDraftPending}
          exitRun={() => {
            socket.removeAllListeners(WebsocketClientEvent.FLOW_RUN_PROGRESS);
            switchToDraft();
          }}
        />
      )}

      <ReactFlowProvider>
        <BuilderTreeViewProvider selectedId={selectedStep || undefined}>
          <ResizablePanelGroup
            direction="horizontal"
            className="absolute left-0 top-0"
            onLayout={(size) => {
              setPanelGroupSize(RESIZABLE_PANEL_GROUP, size as PanelSizes);
            }}
          >
            <LeftSidebarResizablePanel
              minSize={LEFT_SIDEBAR_MIN_SIZE}
              className={cn('min-w-0 w-0 bg-background z-20 shadow-sidebar', {
                [LEFT_SIDEBAR_MIN_EFFECTIVE_WIDTH]:
                  leftSidebar !== LeftSideBarType.NONE,
                'max-w-0': leftSidebar === LeftSideBarType.NONE,
              })}
              isDragging={isDraggingHandle}
            >
              <div className="h-full w-full" ref={leftSidePanelRef}>
                {leftSidebar === LeftSideBarType.RUNS && <FlowRecentRunsList />}
                {leftSidebar === LeftSideBarType.RUN_DETAILS && (
                  <FlowRunDetails />
                )}
                {leftSidebar === LeftSideBarType.VERSIONS && (
                  <FlowVersionsList />
                )}
                {leftSidebar === LeftSideBarType.MENU && <FlowSideMenu />}
                {leftSidebar === LeftSideBarType.TREE_VIEW && <TreeView />}
              </div>
            </LeftSidebarResizablePanel>
            <ResizableHandle
              className="w-0"
              disabled={leftSidebar === LeftSideBarType.NONE}
              onDragging={setIsDraggingHandle}
            />

            <ResizablePanel order={2} id={RESIZABLE_PANEL_IDS.MAIN}>
              {readonly ? (
                <ReadonlyCanvasProvider>
                  <div ref={middlePanelRef} className="relative h-full w-full">
                    <BuilderHeader />
                    <AiAssistantChat
                      middlePanelSize={middlePanelSize}
                      className={'left-4 bottom-[70px]'}
                    />
                    {leftSidebar === LeftSideBarType.NONE && (
                      <AiAssistantButton className="size-[42px] absolute left-4 bottom-[10px] z-50" />
                    )}
                    <CanvasControls
                      topOffset={FLOW_CANVAS_Y_OFFESET}
                      className={cn({
                        'left-[74px]': leftSidebar === LeftSideBarType.NONE,
                      })}
                    ></CanvasControls>
                    <div
                      className={cn('h-screen w-full flex-1 z-10', {
                        'bg-background': !isDraggingHandle,
                      })}
                      id={FLOW_CANVAS_CONTAINER_ID}
                    >
                      <FlowBuilderCanvas />
                    </div>
                  </div>
                </ReadonlyCanvasProvider>
              ) : (
                <InteractiveBuilder
                  selectedStep={selectedStep}
                  clearSelectedStep={clearSelectedStep}
                  middlePanelRef={
                    middlePanelRef as unknown as MutableRefObject<null>
                  }
                  middlePanelSize={middlePanelSize}
                  flowVersion={flowVersion}
                  lefSideBarContainerWidth={leftSidePanelSize?.width || 0}
                />
              )}
            </ResizablePanel>

            <>
              <ResizableHandle
                disabled={!isRightSidebarVisible}
                withHandle={isRightSidebarVisible}
                onDragging={setIsDraggingHandle}
                className="z-50 w-0"
              />

              <ResizablePanel
                ref={rightHandleRef}
                id={RESIZABLE_PANEL_IDS.RIGHT_SIDEBAR}
                defaultSize={0}
                minSize={0}
                maxSize={60}
                order={3}
                className={cn('min-w-0 bg-background z-30', {
                  [minWidthOfSidebar]: isRightSidebarVisible,
                })}
              >
                {isRightSidebarVisible && (
                  <StepSettingsProvider
                    blockModel={blockModel}
                    selectedStep={memorizedSelectedStep as Action | Trigger}
                    key={containerKey}
                  >
                    <DynamicFormValidationProvider>
                      <StepSettingsContainer />
                    </DynamicFormValidationProvider>
                  </StepSettingsProvider>
                )}
              </ResizablePanel>
            </>
          </ResizablePanelGroup>
        </BuilderTreeViewProvider>
        <UndoRedo />
      </ReactFlowProvider>
    </div>
  );
};

BuilderPage.displayName = 'BuilderPage';

export { BuilderPage };
