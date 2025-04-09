import { useUndoRedoDB } from '@/app/features/builder/flow-version-undo-redo/hooks/undo-redo-db';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { toast, UNSAVED_CHANGES_TOAST } from '@openops/components/ui';
import { useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useBuilderStateContext } from '../../builder-hooks';
import { useCenterWorkflowViewOntoStep } from '../../hooks/center-workflow-view-onto-step';
import { REDO_ACTION, UNDO_ACTION } from '../constants';
import { FlowVersionUndoRedoHistoryItem, MoveActionType } from '../types';

export type FlowVersionUndoRedo = {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clearUndoRedoHistory: () => void;
  addToUndoHistory: (
    flowVersionHistoryItem: FlowVersionUndoRedoHistoryItem,
  ) => Promise<void>;
};

const useFlowVersionUndoRedo = (): FlowVersionUndoRedo => {
  const [
    flowVersion,
    setVersion,
    canUndo,
    canRedo,
    setVersionUpdateTimestamp,
    exitStepSettings,
  ] = useBuilderStateContext((state) => [
    state.flowVersion,
    state.setVersion,
    state.canUndo,
    state.canRedo,
    state.setVersionUpdateTimestamp,
    state.exitStepSettings,
  ]);
  const centerWorkflowViewOntoStep = useCenterWorkflowViewOntoStep();

  const { initializeUndoRedoDB, addToUndo, bulkMoveAction, clearUndoRedoDB } =
    useUndoRedoDB(flowVersion.flowId);

  useEffect(() => {
    initializeUndoRedoDB();
  }, [initializeUndoRedoDB]);

  const actionQueue = useRef<Array<MoveActionType>>([]);
  const isBulkActionInProgress = useRef(false); // Flag to track bulk action status

  const clearUndoRedoHistory = async () => {
    clearUndoRedoDB();
    debouncedProcessQueue.cancel();
    actionQueue.current = [];
  };

  const addToUndoHistory = (
    flowVersionHistoryItem: FlowVersionUndoRedoHistoryItem,
  ) => {
    return addToUndo(flowVersionHistoryItem);
  };

  const processQueue = async () => {
    if (isBulkActionInProgress.current || actionQueue.current.length === 0) {
      return;
    }

    isBulkActionInProgress.current = true; // Lock the processing

    try {
      const currentQueue = [...actionQueue.current];
      actionQueue.current = []; // Clear the queue while processing

      const stateToApply = await bulkMoveAction(currentQueue, flowVersion);
      if (stateToApply) {
        const optimisticNextState = {
          ...flowVersion,
          trigger: stateToApply.snapshot,
        };

        setVersion(optimisticNextState);

        const result = await flowsApi.updateFlowVersion(
          optimisticNextState.id,
          {
            trigger: optimisticNextState.trigger,
            valid: optimisticNextState.valid,
            updateTimestamp: flowVersion.updated,
            flowId: flowVersion.flowId,
          },
        );

        if (!result.success) {
          toast(UNSAVED_CHANGES_TOAST);
        }
        setVersionUpdateTimestamp(result.message);

        centerWorkflowViewOntoStep(stateToApply.spotlightStepName);
      }
    } catch (error) {
      toast(UNSAVED_CHANGES_TOAST);
    } finally {
      isBulkActionInProgress.current = false; // Unlock the processing

      // Check the queue again after completing the current batch and run it with a debounce
      if (actionQueue.current.length > 0) {
        debouncedProcessQueue();
      }
    }
  };

  // Debounced function to trigger queue processing
  const debouncedProcessQueue = useDebouncedCallback(() => {
    processQueue();
  }, 300);

  useEffect(() => {
    return () => {
      debouncedProcessQueue.cancel();
    };
  }, [debouncedProcessQueue]);

  const enqueueAction = (action: MoveActionType) => {
    exitStepSettings();

    actionQueue.current.push(action);
    if (!isBulkActionInProgress.current) {
      processQueue(); // Start processing if no request is currently running
    }
  };

  return {
    canUndo,
    canRedo,
    undo: () => enqueueAction(UNDO_ACTION),
    redo: () => enqueueAction(REDO_ACTION),
    clearUndoRedoHistory,
    addToUndoHistory,
  };
};

export { useFlowVersionUndoRedo };
