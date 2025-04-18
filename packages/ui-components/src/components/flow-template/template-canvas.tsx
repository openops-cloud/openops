import { Trigger } from '@openops/shared';
import { EdgeTypes, getNodesBounds, NodeTypes } from '@xyflow/react';
import React, { ReactNode, useMemo } from 'react';
import { flowCanvasUtils } from '../../lib/flow-canvas-utils';
import { ReadonlyCanvasProvider } from '../flow-canvas/canvas-context';
import { FlowCanvas } from '../flow-canvas/flow-canvas';
import { BelowFlowWidget } from '../flow-canvas/widgets/below-flow-widget';
import { TemplateCanvasProvider } from './template-canvas-context';

export type TemplateCanvasProps = {
  edgeTypes: EdgeTypes;
  nodeTypes: NodeTypes;
  template: Trigger;
  topOffset?: number;
  children?: ReactNode;
};

const TemplateCanvas = React.memo(
  ({
    edgeTypes,
    nodeTypes,
    template,
    topOffset,
    children,
  }: TemplateCanvasProps) => {
    const [graph, graphHeight] = useMemo(() => {
      const graph = flowCanvasUtils.traverseFlow(template);
      const graphHeight = getNodesBounds(graph.nodes);

      return [graph, graphHeight];
    }, [template]);

    return (
      <div className="w-full h-full relative">
        {!!graph && (
          <TemplateCanvasProvider template={template}>
            <ReadonlyCanvasProvider>
              <FlowCanvas
                edgeTypes={edgeTypes}
                nodeTypes={nodeTypes}
                graph={graph}
                topOffset={topOffset}
              >
                {children}
                <BelowFlowWidget
                  graphHeight={graphHeight.height}
                ></BelowFlowWidget>
              </FlowCanvas>
            </ReadonlyCanvasProvider>
          </TemplateCanvasProvider>
        )}
      </div>
    );
  },
);

TemplateCanvas.displayName = 'TemplateCanvas';
export { TemplateCanvas };
