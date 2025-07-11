import { Action, ActionType, Trigger, TriggerType } from '@openops/shared';
import type { StoryObj } from '@storybook/react';
import { getNodesBounds } from '@xyflow/react';
import React, { useMemo } from 'react';
import { ReadonlyCanvasProvider } from '../../components/flow-canvas/canvas-context';
import { CanvasControls } from '../../components/flow-canvas/canvas-controls';
import { ReturnLoopedgeButton } from '../../components/flow-canvas/edges/return-loop-edge';
import {
  FlowCanvas,
  FlowCanvasProps,
} from '../../components/flow-canvas/flow-canvas';
import { LoopStepPlaceHolder } from '../../components/flow-canvas/loop-step-placeholder';
import { BranchLabelNode } from '../../components/flow-canvas/nodes/branch-label-node';
import { StepPlaceHolder } from '../../components/flow-canvas/nodes/step-holder-placeholder';
import { BelowFlowWidget } from '../../components/flow-canvas/widgets/below-flow-widget';
import { TemplateCanvasProvider } from '../../components/flow-template/template-canvas-context';
import { TemplateEdge } from '../../components/flow-template/template-edge';
import { TemplateStepNode } from '../../components/flow-template/template-step-node';
import { PRIMITIVE_STEP_METADATA } from '../../lib/constants';
import { WorkflowNode, flowCanvasUtils } from '../../lib/flow-canvas-utils';
import { StepMetadata } from '../../lib/types';
import { TooltipProvider } from '../../ui/tooltip';
import template from './flow-templates-data';

const getPrimitiveStepMetadata = (
  step: Action | Trigger,
): StepMetadata | undefined => {
  switch (step.type) {
    case ActionType.BRANCH:
    case ActionType.SPLIT:
    case ActionType.LOOP_ON_ITEMS:
    case ActionType.CODE:
    case TriggerType.EMPTY:
      return PRIMITIVE_STEP_METADATA[step.type];
  }
};

const TemplatePrimitiveStepNodeWithMetadata = React.memo(
  ({ data }: { data: WorkflowNode['data'] }) => {
    if (!data.step) {
      return;
    }
    const stepMetadata = getPrimitiveStepMetadata(data.step);

    return (
      <TemplateStepNode
        stepName={data.step?.name}
        stepMetadata={stepMetadata}
      />
    );
  },
);

TemplatePrimitiveStepNodeWithMetadata.displayName =
  'TemplatePrimitiveStepNodeWithMetadata';

const edgeTypes = {
  apEdge: TemplateEdge,
  apReturnEdge: ReturnLoopedgeButton,
};
const nodeTypes = {
  stepNode: TemplatePrimitiveStepNodeWithMetadata,
  placeholder: StepPlaceHolder,
  bigButton: StepPlaceHolder,
  loopPlaceholder: LoopStepPlaceHolder,
  branchLabel: BranchLabelNode,
};

const FlowCanvasStory = (args: FlowCanvasProps & { template: Trigger }) => {
  const [graph, graphHeight] = useMemo(() => {
    const graph = flowCanvasUtils.traverseFlow(args.template);
    const graphHeight = getNodesBounds(graph.nodes);

    return [graph, graphHeight];
  }, [args.template]);

  return (
    <div className="w-full h-[100vh] relative">
      <TemplateCanvasProvider template={args.template}>
        <ReadonlyCanvasProvider>
          <TooltipProvider>
            <FlowCanvas {...args} graph={graph}>
              <BelowFlowWidget
                graphHeight={graphHeight.height}
              ></BelowFlowWidget>
              <CanvasControls />
            </FlowCanvas>
          </TooltipProvider>
        </ReadonlyCanvasProvider>
      </TemplateCanvasProvider>
    </div>
  );
};

/**
 * Displays a flow canvas.
 */
const meta = {
  title: 'Components/FlowCanvas',
  component: FlowCanvas,
  tags: ['!autodocs'],
  argTypes: {
    edgeTypes: {
      table: {
        disable: true,
      },
    },
    nodeTypes: {
      table: {
        disable: true,
      },
    },
  },
  args: {
    edgeTypes,
    nodeTypes,
  },
  parameters: {
    layout: 'fullscreen',
  },
  render: FlowCanvasStory,
};
export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Shows only primitive steps (with static step data)
 */
export const Default: Story = {
  args: {
    template,
  },
};
