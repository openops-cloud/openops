import { FLOW_CANVAS_Y_OFFESET } from '@/app/constants/flow-canvas';
import {
  AiWidget,
  CanvasControls,
  InteractiveContextProvider,
} from '@openops/components/ui';
import {
  Action,
  ActionType,
  flowHelper,
  FlowVersion,
  StepLocationRelativeToParent,
} from '@openops/shared';
import { MutableRefObject } from 'react';
import { BuilderHeader } from './builder-header/builder-header';
import { DataSelector } from './data-selector';
import { FlowBuilderCanvas } from './flow-canvas/flow-builder-canvas';
import { FLOW_CANVAS_CONTAINER_ID } from './flow-version-undo-redo/constants';
import { usePaste } from './hooks/use-paste';

const InteractiveBuilder = ({
  selectedStep,
  clearSelectedStep,
  middlePanelRef,
  middlePanelSize,
  flowVersion,
}: {
  selectedStep: string | null;
  clearSelectedStep: () => void;
  middlePanelRef: MutableRefObject<null>;
  middlePanelSize: {
    width: number;
    height: number;
  };
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
        <DataSelector
          parentHeight={middlePanelSize.height}
          parentWidth={middlePanelSize.width}
        ></DataSelector>

        <div
          className="h-screen w-full flex-1 z-10"
          id={FLOW_CANVAS_CONTAINER_ID}
        >
          <FlowBuilderCanvas />
        </div>
      </div>
    </InteractiveContextProvider>
  );
};

InteractiveBuilder.displayName = 'InteractiveBuilder';
export { InteractiveBuilder };
