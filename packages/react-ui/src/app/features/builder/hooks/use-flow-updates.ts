import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSocket } from '@/app/common/providers/socket-provider';
import { QueryKeys } from '@/app/constants/query-keys';
import {
  WebsocketClientEvent,
  WorkflowStepAddedPayload,
  WorkflowStepTestedPayload,
  WorkflowStepUpdatedPayload,
} from '@openops/shared';
import { useBuilderStateContext } from '../builder-hooks';
import { stepTestOutputCache } from '../data-selector/data-selector-cache';

export const useFlowUpdates = (flowId: string) => {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const refreshSettings = useBuilderStateContext(
    (state) => state.refreshSettings,
  );

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
        stepTestOutputCache.clearStep(payload.stepId);
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
    // update step settings after the flow query
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event?.query.state.status === 'success' &&
        event?.query.queryKey[0] === QueryKeys.flow &&
        event?.query.queryKey[1] === flowId
      ) {
        requestAnimationFrame(() => {
          refreshSettings();
        });
      }
    });

    return unsubscribe;
  }, [flowId, queryClient, refreshSettings]);
};
