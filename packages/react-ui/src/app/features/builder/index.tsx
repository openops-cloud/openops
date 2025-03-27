import {
  AiWidget,
  BuilderTreeViewProvider,
  CanvasControls,
  ClipboardContextProvider,
  cn,
  ReadonlyCanvasProvider,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useElementSize,
} from '@openops/components/ui';
import { ReactFlowProvider } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ImperativePanelHandle } from 'react-resizable-panels';
import { useSearchParams } from 'react-router-dom';

import {
  LeftSideBarType,
  RightSideBarType,
  useBuilderStateContext,
  useSwitchToDraft,
} from '@/app/features/builder/builder-hooks';
import { DynamicFormValidationProvider } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useResizablePanelGroup } from '@/app/common/hooks/use-resizable-panel-group';
import { useSocket } from '@/app/common/providers/socket-provider';
import { FLOW_CANVAS_Y_OFFESET } from '@/app/constants/flow-canvas';
import { SEARCH_PARAMS } from '@/app/constants/search-params';
import {
  ActionType,
  BlockTrigger,
  FlagId,
  flowHelper,
  isNil,
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
import { blocksHooks } from '../blocks/lib/blocks-hook';
import { RunDetailsBar } from '../flow-runs/components/run-details-bar';
import { FlowSideMenu } from '../navigation/side-menu/flow/flow-side-menu';
import LeftSidebarResizablePanel from '../navigation/side-menu/left-sidebar';
import { BuilderHeader } from './builder-header/builder-header';
import { CopilotSidebar } from './copilot';
import { DataSelector } from './data-selector';
import { FlowBuilderCanvas } from './flow-canvas/flow-builder-canvas';
import { FLOW_CANVAS_CONTAINER_ID } from './flow-version-undo-redo/constants';
import { Paste } from './flow-version-undo-redo/paste';
import { UndoRedo } from './flow-version-undo-redo/undo-redo';
import { FlowVersionsList } from './flow-versions';
import { InteractiveBuilder } from './interactive-builder';
import { FlowRunDetails } from './run-details';
import { FlowRecentRunsList } from './run-list';
import { StepSettingsContainer } from './step-settings';
import { StepSettingsProvider } from './step-settings/step-settings-context';
import { TreeView } from './tree-view';

const minWidthOfSidebar = 'min-w-[max(20vw,400px)]';

const useAnimateSidebar = (
  sidebarValue: LeftSideBarType | RightSideBarType,
) => {
  const handleRef = useRef<ImperativePanelHandle>(null);
  const sidebarbarClosed = [
    LeftSideBarType.NONE,
    RightSideBarType.NONE,
  ].includes(sidebarValue);
  useEffect(() => {
    const sidebarSize = handleRef.current?.getSize() ?? 0;
    if (sidebarbarClosed) {
      handleRef.current?.resize(0);
    } else if (sidebarSize === 0) {
      handleRef.current?.resize(25);
    }
  }, [handleRef, sidebarValue, sidebarbarClosed]);
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
  const showCopyPaste =
    flagsHooks.useFlag<boolean>(FlagId.COPY_PASTE_ACTIONS_ENABLED).data ||
    false;

  const [
    selectedStep,
    leftSidebar,
    setLeftSidebar,
    rightSidebar,
    run,
    canExitRun,
    readonly,
    setReadOnly,
    setRightSidebar,
    exitStepSettings,
    flowVersion,
  ] = useBuilderStateContext((state) => [
    state.selectedStep,
    state.leftSidebar,
    state.setLeftSidebar,
    state.rightSidebar,
    state.run,
    state.canExitRun,
    state.readonly,
    state.setReadOnly,
    state.setRightSidebar,
    state.exitStepSettings,
    state.flowVersion,
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
  const middlePanelRef = useRef(null);
  const middlePanelSize = useElementSize(middlePanelRef);
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

  useEffect(() => {
    socket.on(WebsocketClientEvent.REFRESH_BLOCK, () => {
      refetchBlock();
    });
    return () => {
      socket.removeAllListeners(WebsocketClientEvent.REFRESH_BLOCK);
      socket.removeAllListeners(WebsocketClientEvent.TEST_FLOW_RUN_PROGRESS);
      socket.removeAllListeners(WebsocketClientEvent.TEST_STEP_FINISHED);
      socket.removeAllListeners(WebsocketClientEvent.TEST_FLOW_RUN_STARTED);
      socket.removeAllListeners(WebsocketClientEvent.GENERATE_CODE_FINISHED);
      socket.removeAllListeners(
        WebsocketClientEvent.GENERATE_HTTP_REQUEST_FINISHED,
      );
    };
  }, [socket, refetchBlock]);

  useEffect(() => {
    const viewOnlyParam = searchParams.get(SEARCH_PARAMS.viewOnly) === 'true';

    if (!run && readonly !== viewOnlyParam) {
      if (!readonly && viewOnlyParam) {
        setLeftSidebar(LeftSideBarType.MENU);
      }
      setReadOnly(viewOnlyParam);
    }
  }, [readonly, run, searchParams, setLeftSidebar, setReadOnly]);

  useEffect(() => {
    if (
      !memorizedSelectedStep ||
      memorizedSelectedStep.type === TriggerType.EMPTY
    ) {
      setRightSidebar(RightSideBarType.NONE);
    }
  }, [memorizedSelectedStep, setRightSidebar]);

  const { switchToDraft, isSwitchingToDraftPending } = useSwitchToDraft();

  const { setPanelGroupSize } = useResizablePanelGroup();

  const isRightSidebarVisible =
    rightSidebar === RightSideBarType.BLOCK_SETTINGS &&
    !!memorizedSelectedStep &&
    memorizedSelectedStep.type !== TriggerType.EMPTY &&
    !isBlockLoading;

  return (
    <div className="flex h-screen w-screen flex-col relative">
      {run && (
        <RunDetailsBar
          canExitRun={canExitRun}
          run={run}
          isLoading={isSwitchingToDraftPending}
          exitRun={() => {
            socket.removeAllListeners(
              WebsocketClientEvent.TEST_FLOW_RUN_PROGRESS,
            );
            switchToDraft();
          }}
        />
      )}

      <ReactFlowProvider>
        <ClipboardContextProvider copyPasteActionsEnabled={showCopyPaste}>
          <BuilderTreeViewProvider selectedId={selectedStep || undefined}>
            <ResizablePanelGroup
              direction="horizontal"
              className="absolute left-0 top-0"
              onLayout={(size) => {
                setPanelGroupSize(RESIZABLE_PANEL_GROUP, size);
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
                {leftSidebar === LeftSideBarType.RUNS && <FlowRecentRunsList />}
                {leftSidebar === LeftSideBarType.RUN_DETAILS && (
                  <FlowRunDetails />
                )}
                {leftSidebar === LeftSideBarType.VERSIONS && (
                  <FlowVersionsList />
                )}
                {leftSidebar === LeftSideBarType.AI_COPILOT && (
                  <CopilotSidebar />
                )}
                {leftSidebar === LeftSideBarType.MENU && <FlowSideMenu />}
                {leftSidebar === LeftSideBarType.TREE_VIEW && <TreeView />}
              </LeftSidebarResizablePanel>
              <ResizableHandle
                className="w-0"
                disabled={leftSidebar === LeftSideBarType.NONE}
                onDragging={setIsDraggingHandle}
              />

              <ResizablePanel
                order={2}
                id={RESIZABLE_PANEL_IDS.MAIN}
                className={cn('min-w-[775px]', {
                  'min-w-[830px]': leftSidebar === LeftSideBarType.NONE,
                })}
              >
                {readonly || !showCopyPaste ? (
                  <ReadonlyCanvasProvider>
                    <div
                      ref={middlePanelRef}
                      className="relative h-full w-full"
                    >
                      <BuilderHeader />

                      <CanvasControls
                        topOffset={FLOW_CANVAS_Y_OFFESET}
                      ></CanvasControls>
                      <AiWidget />
                      <DataSelector
                        parentHeight={middlePanelSize.height}
                        parentWidth={middlePanelSize.width}
                      ></DataSelector>
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
                    middlePanelRef={middlePanelRef}
                    middlePanelSize={middlePanelSize}
                    flowVersion={flowVersion}
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
                      selectedStep={memorizedSelectedStep}
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
          <Paste />
        </ClipboardContextProvider>
      </ReactFlowProvider>
    </div>
  );
};

BuilderPage.displayName = 'BuilderPage';
export { BuilderPage };
