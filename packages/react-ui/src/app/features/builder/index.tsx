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
import {
  MutableRefObject,
  ReactNode,
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
import { FLOW_CANVAS_Y_OFFESET } from '@/app/constants/flow-canvas';
import { RESIZABLE_PANEL_IDS } from '@/app/constants/layout';
import { SEARCH_PARAMS } from '@/app/constants/search-params';
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
  BUILDER_LEFT_SIDEBAR_MAX_SIZE,
  BUILDER_MIDDLE_PANEL_TOP_OFFSET,
  BUILDER_RIGHT_SIDEBAR_MAX_SIZE,
  DEFAULT_SIDEBAR_PANEL_SIZE,
  LEFT_SIDEBAR_MIN_EFFECTIVE_WIDTH,
} from '../../constants/sidebar';
import { blocksHooks } from '../blocks/lib/blocks-hook';
import { RunDetailsBar } from '../flow-runs/components/run-details-bar';
import { LeftSideBarType, RightSideBarType } from './builder-types';
import { FlowBuilderCanvas } from './flow-canvas/flow-builder-canvas';
import { FLOW_CANVAS_CONTAINER_ID } from './flow-version-undo-redo/constants';
import { UndoRedo } from './flow-version-undo-redo/undo-redo';
import { FlowVersionsList } from './flow-versions';
import { useFlowUpdates } from './hooks/use-flow-updates';
import { InteractiveBuilder } from './interactive-builder';
import { FlowRunDetails } from './run-details';
import { FlowRecentRunsList } from './run-list';
import { StepSettingsContainer } from './step-settings';
import { StepSettingsProvider } from './step-settings/step-settings-context';
import { TreeView } from './tree-view';

const minWidthOfSidebar = 'min-w-[max(20vw,400px)]';

const useAnimateSidebar = (
  sidebarValue: LeftSideBarType | RightSideBarType,
  panelId: string,
) => {
  const handleRef = useRef<ImperativePanelHandle>(null);
  const { getPanelSize } = useResizablePanelGroup();

  const sidebarbarClosed = [
    LeftSideBarType.NONE,
    RightSideBarType.NONE,
  ].includes(sidebarValue);

  useEffect(() => {
    requestAnimationFrame(() => {
      try {
        if (!handleRef.current) return;

        if (sidebarbarClosed) {
          handleRef.current.collapse();
        } else {
          const storedSize = getPanelSize(panelId);
          const targetSize = storedSize ?? DEFAULT_SIDEBAR_PANEL_SIZE;
          handleRef.current.expand(targetSize);
        }
      } catch (err) {
        console.warn('Sidebar update skipped', err);
      }
    });
  }, [sidebarValue, sidebarbarClosed, panelId, getPanelSize]);

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

const BuilderPage = ({ children }: { children?: ReactNode }) => {
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
  const [leftSidePanelRef] = useMeasure<HTMLDivElement>();
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);

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

  const isRightSidebarVisible = useMemo(() => {
    return (
      rightSidebar === RightSideBarType.BLOCK_SETTINGS &&
      !!memorizedSelectedStep &&
      memorizedSelectedStep.type !== TriggerType.EMPTY &&
      !isBlockLoading
    );
  }, [rightSidebar, memorizedSelectedStep, isBlockLoading]);

  const isLeftSidebarVisible = leftSidebar !== LeftSideBarType.NONE;

  const rightHandleRef = useRef<ImperativePanelHandle>(null);
  const leftHandleRef = useAnimateSidebar(
    leftSidebar,
    RESIZABLE_PANEL_IDS.BUILDER_LEFT_SIDEBAR,
  );

  const socket = useSocket();

  useRunProgress({
    run,
    setRun,
    flowVersion,
  });

  useRefreshBlock({
    refetchBlock,
  });

  useFlowUpdates();

  useEffect(() => {
    const viewOnlyParam = searchParams.get(SEARCH_PARAMS.viewOnly) === 'true';

    if (!run && readonly !== viewOnlyParam) {
      if (!readonly && viewOnlyParam) {
        setLeftSidebar(LeftSideBarType.NONE);
      }
      setReadOnly(viewOnlyParam);
    }
  }, [readonly, run, searchParams, setLeftSidebar, setReadOnly]);

  const { switchToDraft, isSwitchingToDraftPending } = useSwitchToDraft();

  const { setPanelsSize, getPanelSize } = useResizablePanelGroup();

  useEffect(() => {
    if (!rightHandleRef.current) {
      return;
    }

    if (isRightSidebarVisible) {
      const storedSize = getPanelSize(
        RESIZABLE_PANEL_IDS.BUILDER_RIGHT_SIDEBAR,
      );
      const targetSize = storedSize ?? DEFAULT_SIDEBAR_PANEL_SIZE;
      rightHandleRef.current.expand(targetSize);
    } else {
      rightHandleRef.current.collapse();
    }
  }, [isRightSidebarVisible, getPanelSize]);

  const middlePanelSize = useMemo(() => {
    return {
      width: rawMiddlePanelSize.width,
      height: rawMiddlePanelSize.height - BUILDER_MIDDLE_PANEL_TOP_OFFSET,
    };
  }, [rawMiddlePanelSize.height, rawMiddlePanelSize.width]);

  const onResize = useCallback(
    (size: number[]) => {
      setPanelsSize({
        [RESIZABLE_PANEL_IDS.BUILDER_LEFT_SIDEBAR]: size[0],
        [RESIZABLE_PANEL_IDS.BUILDER_MAIN]: size[1],
        [RESIZABLE_PANEL_IDS.BUILDER_RIGHT_SIDEBAR]: size[2],
      });
    },
    [setPanelsSize],
  );

  return (
    <div className="flex h-full w-full flex-col relative">
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
            className="h-full @container"
            id="builder-panel-group"
            onLayout={onResize}
          >
            <ResizablePanel
              ref={leftHandleRef}
              id={RESIZABLE_PANEL_IDS.BUILDER_LEFT_SIDEBAR}
              minSize={0}
              maxSize={BUILDER_LEFT_SIDEBAR_MAX_SIZE}
              defaultSize={0}
              order={1}
              collapsible={true}
              collapsedSize={0}
              className={cn('min-w-0 w-0 bg-background z-10', {
                [LEFT_SIDEBAR_MIN_EFFECTIVE_WIDTH]: isLeftSidebarVisible,
                'max-w-0': !isLeftSidebarVisible,
                'transition-none': isDraggingHandle,
                'shadow-sidebar': isLeftSidebarVisible,
                'max-w-[45%]': isLeftSidebarVisible,
              })}
            >
              <div className="h-full w-full" ref={leftSidePanelRef}>
                {leftSidebar === LeftSideBarType.RUNS && <FlowRecentRunsList />}
                {leftSidebar === LeftSideBarType.RUN_DETAILS && (
                  <FlowRunDetails />
                )}
                {leftSidebar === LeftSideBarType.VERSIONS && (
                  <FlowVersionsList />
                )}
                {leftSidebar === LeftSideBarType.TREE_VIEW && <TreeView />}
              </div>
            </ResizablePanel>

            <ResizableHandle
              className="w-0"
              disabled={!isLeftSidebarVisible}
              onDragging={setIsDraggingHandle}
            />

            <ResizablePanel order={2} id={RESIZABLE_PANEL_IDS.BUILDER_MAIN}>
              {readonly ? (
                <ReadonlyCanvasProvider>
                  <div ref={middlePanelRef} className="relative h-full w-full">
                    {children}
                    <CanvasControls
                      topOffset={FLOW_CANVAS_Y_OFFESET}
                    ></CanvasControls>
                    <div
                      className="h-full w-full flex-1 z-10 bg-background"
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
                >
                  {children}
                </InteractiveBuilder>
              )}
            </ResizablePanel>

            {isRightSidebarVisible && (
              <ResizableHandle
                withHandle={false}
                onDragging={setIsDraggingHandle}
                className="z-50 w-0"
              />
            )}

            <ResizablePanel
              ref={rightHandleRef}
              id={RESIZABLE_PANEL_IDS.BUILDER_RIGHT_SIDEBAR}
              defaultSize={0}
              minSize={0}
              maxSize={BUILDER_RIGHT_SIDEBAR_MAX_SIZE}
              order={3}
              collapsible={true}
              collapsedSize={0}
              className={cn('min-w-0 bg-background z-30', {
                [minWidthOfSidebar]: isRightSidebarVisible,
                hidden: !isRightSidebarVisible,
                'border-l': isRightSidebarVisible,
                'shadow-sidebar': isRightSidebarVisible,
                'max-w-[45%]': isRightSidebarVisible,
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
          </ResizablePanelGroup>
        </BuilderTreeViewProvider>
        <UndoRedo />
      </ReactFlowProvider>
    </div>
  );
};

BuilderPage.displayName = 'BuilderPage';

export { BuilderPage };
