import {
  CollisionDetection,
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
import { useApplyOperationAndPushToHistory } from '../flow-version-undo-redo/hooks/apply-operation-and-push-to-history';

type FlowDragLayerProps = {
  children: React.ReactNode;
};

// https://github.com/clauderic/dnd-kit/pull/334#issuecomment-1965708784
const fixCursorSnapOffset: CollisionDetection = (args) => {
  // Bail out if keyboard activated
  if (!args.pointerCoordinates) {
    return rectIntersection(args);
  }
  const { x, y } = args.pointerCoordinates;
  const { width, height } = args.collisionRect;
  const updated = {
    ...args,
    // The collision rectangle is broken when using snapCenterToCursor. Reset
    // the collision rectangle based on pointer location and overlay size.
    collisionRect: {
      width,
      height,
      bottom: y + height / 2,
      left: x - width / 2,
      right: x + width / 2,
      top: y - height / 2,
    },
  };
  return rectIntersection(updated);
};

const FlowDragLayer = ({ children }: FlowDragLayerProps) => {
  const { toast } = useToast();
  const [
    setActiveDraggingStep,
    flowVersion,
    activeDraggingStep,
    setAllowCanvasPanning,
  ] = useBuilderStateContext((state) => [
    state.setActiveDraggingStep,
    state.flowVersion,
    state.activeDraggingStep,
    state.setAllowCanvasPanning,
  ]);

  const applyOperationAndPushToHistory = useApplyOperationAndPushToHistory();
  const draggedStep = activeDraggingStep
    ? flowHelper.getStep(flowVersion, activeDraggingStep)
    : undefined;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDraggingStep(e.active.id.toString());
    setAllowCanvasPanning(false);
  };

  const handleDragCancel = () => {
    setActiveDraggingStep(null);
    setAllowCanvasPanning(true);
  };
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDraggingStep(null);
    setAllowCanvasPanning(true);
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
      {draggedStep && <StepDragOverlay step={draggedStep}></StepDragOverlay>}
    </>
  );
};

export { FlowDragLayer };
