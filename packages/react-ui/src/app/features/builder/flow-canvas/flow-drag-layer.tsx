import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Edge, UNSAVED_CHANGES_TOAST, useToast } from '@openops/components/ui';
import { t } from 'i18next';

import { flowHelper, FlowOperationType } from '@openops/shared';

import { useBuilderStateContext } from '../builder-hooks';

import StepDragOverlay from '@/app/features/builder/flow-canvas/step-drag-overlay';
import { useViewport } from '@xyflow/react';
import { useCallback, useState } from 'react';
import { useApplyOperationAndPushToHistory } from '../flow-version-undo-redo/hooks/apply-operation-and-push-to-history';

type FlowDragLayerProps = {
  children: React.ReactNode;
  lefSideBarContainerWidth: number;
  cursorPosition: { x: number; y: number };
};

const FlowDragLayer = ({
  children,
  lefSideBarContainerWidth,
  cursorPosition,
}: FlowDragLayerProps) => {
  const { toast } = useToast();
  const viewport = useViewport();
  const [previousViewPort, setPreviousViewPort] = useState(viewport);
  const [setActiveDraggingStep, flowVersion, activeDraggingStep] =
    useBuilderStateContext((state) => [
      state.setActiveDraggingStep,
      state.flowVersion,
      state.activeDraggingStep,
    ]);

  const applyOperationAndPushToHistory = useApplyOperationAndPushToHistory();

  const fixCursorSnapOffset = useCallback(
    (args: Parameters<typeof rectIntersection>[0]) => {
      // Bail out if keyboard activated
      if (!args.pointerCoordinates) {
        return rectIntersection(args);
      }
      const { x, y } = args.pointerCoordinates;
      const { width, height } = args.collisionRect;
      const deltaViewport = {
        x: previousViewPort.x - viewport.x,
        y: previousViewPort.y - viewport.y,
      };
      const updated = {
        ...args,
        // The collision rectangle is broken when using snapCenterToCursor. Reset
        // the collision rectangle based on pointer location and overlay size.
        collisionRect: {
          width,
          height,
          bottom: y + height / 2 + deltaViewport.y,
          left: x - width / 2 + deltaViewport.x,
          right: x + width / 2 + deltaViewport.x,
          top: y - height / 2 + deltaViewport.y,
        },
      };
      return rectIntersection(updated);
    },
    [viewport.x, viewport.y, previousViewPort.x, previousViewPort.y],
  );

  const draggedStep = activeDraggingStep
    ? flowHelper.getStep(flowVersion, activeDraggingStep)
    : undefined;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDraggingStep(e.active.id.toString());
    setPreviousViewPort(viewport);
  };

  const handleDragCancel = () => {
    setActiveDraggingStep(null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDraggingStep(null);
    if (
      e.over &&
      e.over.data.current &&
      e.over.data.current.accepts === e.active.data?.current?.type
    ) {
      const edgeData: Edge['data'] = e.over.data.current as Edge['data'];
      if (edgeData && edgeData.parentStep && draggedStep) {
        const isPartOfInnerFlow = flowHelper.isPartOfInnerFlow({
          parentStep: draggedStep,
          childName: edgeData.parentStep,
        });
        if (isPartOfInnerFlow) {
          toast({
            title: t('Invalid Move'),
            description: t('The destination location is inside the same step'),
            duration: 3000,
          });
          return;
        }
        applyOperationAndPushToHistory(
          {
            type: FlowOperationType.MOVE_ACTION,
            request: {
              name: draggedStep.name,
              newParentStep: edgeData.parentStep,
              stepLocationRelativeToNewParent:
                edgeData.stepLocationRelativeToParent,
              branchNodeId: edgeData.branchNodeId,
            },
          },
          () => toast(UNSAVED_CHANGES_TOAST),
        );
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor),
  );

  return (
    <>
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        sensors={sensors}
        collisionDetection={fixCursorSnapOffset}
      >
        {children}
        <DragOverlay dropAnimation={{ duration: 0 }}></DragOverlay>
      </DndContext>
      {draggedStep && (
        <StepDragOverlay
          step={draggedStep}
          lefSideBarContainerWidth={lefSideBarContainerWidth}
          cursorPosition={cursorPosition}
        ></StepDragOverlay>
      )}
    </>
  );
};

export { FlowDragLayer };
