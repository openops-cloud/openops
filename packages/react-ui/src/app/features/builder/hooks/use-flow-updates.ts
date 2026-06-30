import { useSocket } from '@/app/common/providers/socket-provider';
import { QueryKeys } from '@/app/constants/query-keys';
import {
  PopulatedFlow,
  WebsocketClientEvent,
  WorkflowStepAddedPayload,
  WorkflowStepTestedPayload,
  WorkflowStepUpdatedPayload,
} from '@openops/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useBuilderStateContext } from '../builder-hooks';
import { stepTestOutputCache } from '../data-selector/data-selector-cache';
import { shouldResyncStepSettings } from './should-resync-step-settings';

export const useFlowUpdates = (flowId: string) => {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const refreshSettings = useBuilderStateContext(
    (state) => state.refreshSettings,
  );
  const currentFlowVersion = useBuilderStateContext(
    (state) => state.flowVersion,
  );

  // Mirror the builder's current version into a ref so the query-cache
  // subscription below can compare against it synchronously.
  const currentFlowVersionRef = useRef(currentFlowVersion);
  currentFlowVersionRef.current = currentFlowVersion;

  useEffect(() => {
    if (!flowId) {
      return;
    }

    const handleUpdate = (
      payload:
        | WorkflowStepAddedPayload
        | WorkflowStepUpdatedPayload
        | WorkflowStepTestedPayload,
    ) => {
      if (payload.flowId === flowId) {
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.flow, flowId],
        });
      }

      if ('stepId' in payload && payload.stepId) {
        stepTestOutputCache.clearStep(payload.stepId, payload.stepName);
        queryClient.invalidateQueries({
          queryKey: [
            QueryKeys.stepTestOutput,
            payload.flowVersionId,
            payload.stepId,
          ],
        });
      }
    };

    socket.on(WebsocketClientEvent.WORKFLOW_STEP_ADDED, handleUpdate);
    socket.on(WebsocketClientEvent.WORKFLOW_STEP_UPDATED, handleUpdate);
    socket.on(WebsocketClientEvent.WORKFLOW_STEP_TESTED, handleUpdate);

    return () => {
      socket.removeAllListeners(WebsocketClientEvent.WORKFLOW_STEP_ADDED);
      socket.removeAllListeners(WebsocketClientEvent.WORKFLOW_STEP_UPDATED);
      socket.removeAllListeners(WebsocketClientEvent.WORKFLOW_STEP_TESTED);
    };
  }, [socket, queryClient, flowId, refreshSettings]);

  useEffect(() => {
    // Re-sync the step settings form when the flow changes externally, but not
    // on a window-focus refetch that returns what the builder already has
    // (see shouldResyncStepSettings) — that would reset the form and remount the
    // dynamic array properties, re-firing their `/options` requests.
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const isFlowQuerySuccess =
        event?.query.state.status === 'success' &&
        event.query.queryKey[0] === QueryKeys.flow &&
        event.query.queryKey[1] === flowId;
      if (!isFlowQuerySuccess) {
        return;
      }

      const refetchedFlow = event.query.state.data as PopulatedFlow | undefined;
      if (
        !shouldResyncStepSettings(
          refetchedFlow?.version,
          currentFlowVersionRef.current,
        )
      ) {
        return;
      }

      requestAnimationFrame(() => refreshSettings());
    });

    return unsubscribe;
  }, [flowId, queryClient, refreshSettings]);
};
