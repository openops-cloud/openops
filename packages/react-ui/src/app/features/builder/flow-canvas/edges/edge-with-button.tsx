import { DragMoveEvent, useDndMonitor, useDroppable } from '@dnd-kit/core';
import {
  BranchLabel,
  cn,
  DRAGGED_STEP_TAG,
  EdgePath,
  getBranchNodeId,
  getEdgePath,
  getLengthMultiplier,
  getPositionRelativeToParent,
  getSplitEdgeData,
  LINE_WIDTH,
} from '@openops/components/ui';
import {
  FlowOperationType,
  isNil,
  StepLocationRelativeToParent,
} from '@openops/shared';
import { BaseEdge, useNodes } from '@xyflow/react';
import { t } from 'i18next';
import React, { useState } from 'react';

import { useBuilderStateContext } from '../../builder-hooks';

import { BlockSelector } from '@/app/features/builder/blocks-selector';
import { attributesHelper } from '../attributes-helper';
import { FlowAddButton } from '../flow-add-button';

const BUTTON_SIZE = {
  width: 24,
  height: 24,
};

const EdgeWithButton = React.memo((props: EdgePath) => {
  const nodes = useNodes();
  const [isStepInsideDropzone, setIsStepInsideDropzone] = useState(false);
  const [activeDraggingStep, readonly] = useBuilderStateContext((state) => [
    state.activeDraggingStep,
    state.readonly,
  ]);

  const { isInsideSplit, isInsideBranch, isInsideLoop } =
    getPositionRelativeToParent(props.data.stepLocationRelativeToParent);
  const lengthMultiplier = getLengthMultiplier({
    isInsideBranch,
    isInsideSplit,
    isInsideLoop,
  });

  const { edgePath, buttonPosition } = getEdgePath({
    ...props,
    lengthMultiplier,
  });

  const { setNodeRef } = useDroppable({
    id: props.id,
    data: {
      accepts: DRAGGED_STEP_TAG,
      ...props.data,
      branchNodeId: getBranchNodeId(props.target, nodes),
    },
  });

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const showDropIndicator = !isNil(activeDraggingStep);

  useDndMonitor({
    onDragMove(event: DragMoveEvent) {
      setIsStepInsideDropzone(event.collisions?.[0]?.id === props.id);
    },
    onDragEnd() {
      setIsStepInsideDropzone(false);
    },
  });

  const branchNodeId = getBranchNodeId(props.target, nodes);

  return (
    <>
      <BaseEdge
        interactionWidth={0}
        path={edgePath}
        style={{ strokeWidth: `${LINE_WIDTH}px` }}
        className="cursor-default !stroke-greyBlue"
      />
      {isInsideBranch && (
        <BranchLabel
          branchName={
            props.data.stepLocationRelativeToParent ===
            StepLocationRelativeToParent.INSIDE_TRUE_BRANCH
              ? t('True')
              : t('False')
          }
          isDefaultBranch={false}
          buttonPosition={buttonPosition}
        />
      )}
      {isInsideSplit && (
        <BranchLabel
          {...getSplitEdgeData(props.source, props.target, nodes)}
          buttonPosition={buttonPosition}
        />
      )}
      {props.data?.addButton && !readonly && (
        <BlockSelector
          operation={{
            type: FlowOperationType.ADD_ACTION,
            actionLocation: {
              parentStep: props.data.parentStep!,
              stepLocationRelativeToParent:
                props.data.stepLocationRelativeToParent!,
              branchNodeId,
            },
          }}
          open={actionMenuOpen}
          onOpenChange={setActionMenuOpen}
        >
          <foreignObject
            width={BUTTON_SIZE.width}
            height={BUTTON_SIZE.height}
            x={buttonPosition.x}
            y={
              isInsideSplit || isInsideBranch
                ? buttonPosition.y + BUTTON_SIZE.height + 2
                : buttonPosition.y
            }
            className={cn('rounded-full transition-all', {
              'shadow-add-button': isStepInsideDropzone,
            })}
            {...attributesHelper.addPlusButtonAttribute(
              props.data.parentStep!,
              props.data.stepLocationRelativeToParent!,
              branchNodeId,
            )}
          >
            <FlowAddButton
              ref={setNodeRef}
              showDropIndicator={showDropIndicator}
              actionMenuOpen={actionMenuOpen}
              isStepInsideDropzone={isStepInsideDropzone}
              className="size-6"
              iconClassName="size-[14px] stroke-[2.5]"
            />
          </foreignObject>
        </BlockSelector>
      )}
    </>
  );
});

EdgeWithButton.displayName = 'EdgeWithButton';
export { EdgeWithButton };
