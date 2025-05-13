import { FLOW_CANVAS_Y_OFFESET } from '@/app/constants/flow-canvas';
import {
  AI_CHAT_CONTAINER_SIZES,
  AiWidget,
  CanvasControls,
  cn,
  InteractiveContextProvider,
} from '@openops/components/ui';
import {
  Action,
  ActionType,
  flowHelper,
  FlowVersion,
  isNil,
  StepLocationRelativeToParent,
} from '@openops/shared';
import React, { MutableRefObject, useCallback, useEffect, useRef } from 'react';
import { useDebounceCallback } from 'usehooks-ts';
import { StepSettingsAiChat } from './ai-chat/step-settings-ai-chat';
import { textMentionUtils } from './block-properties/text-input-with-mentions/text-input-utils';
import { BuilderHeader } from './builder-header/builder-header';
import { useBuilderStateContext } from './builder-hooks';
import { DataSelector } from './data-selector';
import { DataSelectorSizeState } from './data-selector/data-selector-size-togglers';
import { FlowBuilderCanvas } from './flow-canvas/flow-builder-canvas';
import { FLOW_CANVAS_CONTAINER_ID } from './flow-version-undo-redo/constants';
import { usePaste } from './hooks/use-paste';

const doesHaveInputThatUsesMentionClass = (
  element: Element | null,
): boolean => {
  if (isNil(element)) {
    return false;
  }
  if (element.classList.contains(textMentionUtils.inputThatUsesMentionClass)) {
    return true;
  }
  const parent = element.parentElement;
  if (parent) {
    return doesHaveInputThatUsesMentionClass(parent);
  }
  return false;
};

const InteractiveBuilder = ({
  selectedStep,
  clearSelectedStep,
  middlePanelRef,
  middlePanelSize,
  flowVersion,
  lefSideBarContainerWidth,
}: {
  selectedStep: string | null;
  clearSelectedStep: () => void;
  middlePanelRef: MutableRefObject<null>;
  middlePanelSize: {
    width: number;
    height: number;
  };
  lefSideBarContainerWidth: number;
  flowVersion: FlowVersion;
}) => {
  const { onPaste } = usePaste();

  const onPasteOperation = (actionToPaste: Action): void => {
    if (selectedStep) {
      const selectedStepDetails = flowHelper.getStep(flowVersion, selectedStep);

      const pasteMapping: Partial<
        Record<ActionType, StepLocationRelativeToParent>
      > = {
        [ActionType.LOOP_ON_ITEMS]: StepLocationRelativeToParent.INSIDE_LOOP,
        [ActionType.BRANCH]: StepLocationRelativeToParent.INSIDE_TRUE_BRANCH,
        [ActionType.SPLIT]: StepLocationRelativeToParent.INSIDE_SPLIT,
      };

      const location =
        selectedStepDetails && selectedStepDetails.type in pasteMapping
          ? pasteMapping[selectedStepDetails.type as ActionType]
          : StepLocationRelativeToParent.AFTER;

      if (!location) {
        return;
      }

      const branchNodeId =
        selectedStepDetails?.type === ActionType.SPLIT
          ? selectedStepDetails.settings.options[0].id
          : undefined;

      onPaste(actionToPaste, location, selectedStep, branchNodeId);
    }
  };

  const [state, dispatch] = useBuilderStateContext((state) => [
    state.midpanelState,
    state.applyMidpanelAction,
  ]);

  const checkFocus = useCallback(() => {
    const isTextMentionInputFocused = doesHaveInputThatUsesMentionClass(
      document.activeElement,
    );

    if (isTextMentionInputFocused) {
      dispatch({ type: 'FOCUS_INPUT_WITH_MENTIONS' });
      return;
    }

    const isClickAway =
      !isNil(containerRef.current) &&
      !containerRef.current.contains(document.activeElement);

    if (isClickAway) {
      dispatch({ type: 'PANEL_CLICK_AWAY' });
    }
  }, [dispatch]);

  const debouncedCheckFocus = useDebounceCallback(checkFocus, 100);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.addEventListener('focusin', debouncedCheckFocus);
    document.addEventListener('focusout', debouncedCheckFocus);

    return () => {
      document.removeEventListener('focusin', debouncedCheckFocus);
      document.removeEventListener('focusout', debouncedCheckFocus);
    };
  }, [debouncedCheckFocus]);

  const onSetShowDataSelector = (dataSelectorSize: DataSelectorSizeState) => {
    if (dataSelectorSize === DataSelectorSizeState.COLLAPSED) {
      dispatch({ type: 'DATASELECTOR_MIMIZE_CLICK' });
    } else if (dataSelectorSize === DataSelectorSizeState.DOCKED) {
      dispatch({ type: 'DATASELECTOR_DOCK_CLICK' });
    } else {
      dispatch({ type: 'DATASELECTOR_EXPAND_CLICK' });
    }
  };

  return (
    <InteractiveContextProvider
      selectedStep={selectedStep}
      clearSelectedStep={clearSelectedStep}
      flowVersion={flowVersion}
      onPaste={onPasteOperation}
      flowCanvasContainerId="flow-canvas-container"
    >
      <div ref={middlePanelRef} className="relative h-full w-full">
        <BuilderHeader />
        <CanvasControls topOffset={FLOW_CANVAS_Y_OFFESET}></CanvasControls>
        <AiWidget classname="left-[282px]" />
        <div
          className="flex flex-col absolute bottom-0 right-0"
          ref={containerRef}
        >
          <StepSettingsAiChat
            middlePanelSize={middlePanelSize}
            selectedStep={selectedStep}
            flowVersion={flowVersion}
          />
          <DataSelector
            parentHeight={middlePanelSize.height}
            parentWidth={middlePanelSize.width}
            showDataSelector={state.showDataSelector}
            dataSelectorSize={state.dataSelectorSize}
            setDataSelectorSize={onSetShowDataSelector}
            className={cn({
              'children:transition-none':
                state.dataSelectorSize === DataSelectorSizeState.COLLAPSED &&
                state.showAiChat &&
                state.aiContainerSize === AI_CHAT_CONTAINER_SIZES.DOCKED,
            })}
          ></DataSelector>
        </div>

        <div
          className="h-screen w-full flex-1 z-10"
          id={FLOW_CANVAS_CONTAINER_ID}
        >
          <FlowBuilderCanvas
            lefSideBarContainerWidth={lefSideBarContainerWidth}
          />
        </div>
      </div>
    </InteractiveContextProvider>
  );
};

InteractiveBuilder.displayName = 'InteractiveBuilder';
export { InteractiveBuilder };
