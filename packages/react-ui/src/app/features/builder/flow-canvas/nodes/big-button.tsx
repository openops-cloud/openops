import { DragMoveEvent, useDndMonitor, useDroppable } from '@dnd-kit/core';
import { FlowOperationType, isNil } from '@openops/shared';
import { Handle, Position } from '@xyflow/react';
import React, { useId, useState } from 'react';

import { BlockSelector } from '@/app/features/builder/blocks-selector';
import {
  DRAGGED_STEP_TAG,
  LINE_WIDTH,
  OPS_NODE_SIZE,
  WorkflowNode,
} from '@openops/components/ui';
import { useBuilderStateContext } from '../../builder-hooks';
import { attributesHelper } from '../attributes-helper';
import { FlowAddButton } from '../flow-add-button';

const BigButton = React.memo(({ data }: { data: WorkflowNode['data'] }) => {
  const [isStepInsideDropzone, setIsStepInsideDropzone] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [readonly, activeDraggingStep] = useBuilderStateContext((state) => [
    state.readonly,
    state.activeDraggingStep,
  ]);
  const id = useId();
  const { setNodeRef } = useDroppable({
    id,
    data: {
      accepts: DRAGGED_STEP_TAG,
      ...data,
    },
  });
  const showDropIndicator = !isNil(activeDraggingStep);

  useDndMonitor({
    onDragMove(event: DragMoveEvent) {
      setIsStepInsideDropzone(event.over?.id === id);
    },
    onDragEnd() {
      setIsStepInsideDropzone(false);
    },
  });

  return (
    <>
      {!readonly && (
        <div
          style={{
            height: `${OPS_NODE_SIZE.bigButton.height}px`,
            width: `${OPS_NODE_SIZE.stepNode.width}px`,
          }}
          className="cursor-auto flex items-center justify-center relative pointer-events-auto"
        >
          <BlockSelector
            operation={{
              type: FlowOperationType.ADD_ACTION,
              actionLocation: {
                parentStep: data.parentStep!,
                stepLocationRelativeToParent:
                  data.stepLocationRelativeToParent!,
                branchNodeId: data.branchNodeId,
              },
            }}
            open={actionMenuOpen}
            onOpenChange={setActionMenuOpen}
          >
            <div
              {...attributesHelper.addPlusButtonAttribute(
                data.parentStep!,
                data.stepLocationRelativeToParent!,
                data.branchNodeId,
              )}
            >
              <FlowAddButton
                ref={(ref) => setNodeRef(ref)}
                showDropIndicator={showDropIndicator}
                actionMenuOpen={actionMenuOpen}
                isStepInsideDropzone={isStepInsideDropzone}
                className="size-8"
              />
            </div>
          </BlockSelector>
        </div>
      )}
      {readonly && (
        <div
          style={{
            height: `${OPS_NODE_SIZE.bigButton.height}px`,
            width: `${OPS_NODE_SIZE.stepNode.width}px`,
          }}
          className="cursor-auto flex items-center justify-center relative stroke-greyBlue"
        >
          <svg className="overflow-visible  mt-7 ">
            <path d="M 150 0 V 100" strokeWidth={LINE_WIDTH} />
          </svg>
        </div>
      )}

      <Handle type="source" style={{ opacity: 0 }} position={Position.Bottom} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    </>
  );
});

BigButton.displayName = 'BigButton';
export { BigButton };
