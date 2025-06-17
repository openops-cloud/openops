import { flowHelper } from '@openops/shared';
import { Handle, Position } from '@xyflow/react';
import React, { useMemo } from 'react';
import { OPS_NODE_SIZE } from '../../lib/flow-canvas-utils';
import { StepMetadata } from '../../lib/types';
import { BlockIcon } from '../block-icon';
import { SampleDataLabel } from '../flow-canvas/sample-data-label';
import { OverflowTooltip } from '../overflow-tooltip';
import { useTemplateCanvasContext } from './template-canvas-context';

const TemplateStepNode = React.memo(
  ({
    stepMetadata,
    stepName,
  }: {
    stepMetadata?: StepMetadata;
    stepName?: string;
  }) => {
    const { template } = useTemplateCanvasContext();

    const { step, stepIndex, displayName } = useMemo(() => {
      const steps = flowHelper.getAllSteps(template);
      const step = steps.find((step) => step.name === stepName);

      const index = steps.findIndex((step) => step.name === stepName);
      return {
        step,
        stepIndex: index + 1,
        displayName: steps[index].displayName,
      };
    }, [stepName, template]);

    const hasSampleData = !!step?.settings?.inputUiInfo?.sampleData;

    return (
      <>
        <div
          id={stepName}
          style={{
            height: `${OPS_NODE_SIZE.stepNode.height}px`,
            width: `${OPS_NODE_SIZE.stepNode.width}px`,
          }}
          className={
            'transition-all border-box rounded-sm border border-solid border-border-300 relative hover:border-primary-200 group z-10'
          }
        >
          <div className="h-full w-full rounded-sm overflow-hidden bg-background pl-4 pr-2 py-[10px] flex flex-col justify-between">
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

            <div className="flex justify-between gap-[6px] w-full items-center">
              <OverflowTooltip text={`${stepIndex}. ${displayName}`} />
            </div>
          </div>

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
        {hasSampleData && <SampleDataLabel />}
      </>
    );
  },
);

TemplateStepNode.displayName = 'TemplateStepNode';
export { TemplateStepNode };
