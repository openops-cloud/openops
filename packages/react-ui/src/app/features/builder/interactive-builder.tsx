import { FLOW_CANVAS_Y_OFFESET } from '@/app/constants/flow-canvas';
import {
  AiWidget,
  CanvasControls,
  InteractiveContextProvider,
} from '@openops/components/ui';
import { FlowVersion } from '@openops/shared';
import { MutableRefObject } from 'react';
import { BuilderHeader } from './builder-header/builder-header';
import { DataSelector } from './data-selector';
import { FlowBuilderCanvas } from './flow-canvas/flow-builder-canvas';
import { FLOW_CANVAS_CONTAINER_ID } from './flow-version-undo-redo/constants';

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
  return (
    <InteractiveContextProvider
      selectedStep={selectedStep}
      clearSelectedStep={clearSelectedStep}
      flowVersion={flowVersion}
    >
      <div ref={middlePanelRef} className="relative h-full w-full">
        <BuilderHeader />

        <CanvasControls topOffset={FLOW_CANVAS_Y_OFFESET}></CanvasControls>
        <AiWidget />
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
