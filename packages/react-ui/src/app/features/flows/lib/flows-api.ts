import { AxiosRequestConfig } from 'axios';
import { nanoid } from 'nanoid';
import { Socket } from 'socket.io-client';

import { api } from '@/app/lib/api';
import {
  CreateEmptyFlowRequest,
  CreateFlowFromTemplateRequest,
  CreateStepRunRequestBody,
  FlowImportTemplate,
  FlowOperationRequest,
  FlowRun,
  FlowRunStatus,
  FlowVersion,
  FlowVersionMetadata,
  GetFlowQueryParamsRequest,
  GetFlowTemplateRequestQuery,
  ListFlowVersionRequest,
  ListFlowsRequest,
  MinimalFlow,
  PopulatedFlow,
  SeekPage,
  StepRunResponse,
  TestFlowRunRequestBody,
  UpdateFlowVersionRequest,
  WebsocketClientEvent,
  WebsocketServerEvent,
} from '@openops/shared';

export type UpdateFlowVersionResponse = {
  success: boolean;
  message: string;
};

export const flowsApi = {
  applyOperation(flowId: string, operation: FlowOperationRequest) {
    return api.post<PopulatedFlow>(`/v1/flows/${flowId}`, operation);
  },
  list(
    request: ListFlowsRequest,
    config?: AxiosRequestConfig,
  ): Promise<SeekPage<PopulatedFlow>> {
    return api.get<SeekPage<PopulatedFlow>>('/v1/flows', request, config);
  },
  create(request: CreateEmptyFlowRequest | CreateFlowFromTemplateRequest) {
    return api.post<PopulatedFlow>('/v1/flows', request);
  },
  update(flowId: string, request: FlowOperationRequest) {
    return api.post<PopulatedFlow>(`/v1/flows/${flowId}`, request);
  },
  updateFlowVersion(flowVersionId: string, request: UpdateFlowVersionRequest) {
    return api.post<UpdateFlowVersionResponse>(
      `/v1/flow-versions/${flowVersionId}/trigger`,
      request,
    );
  },
  getLatestFlowVersionsByConnection(request: { connectionName: string }) {
    return api.get<MinimalFlow[]>(`/v1/flow-versions`, request);
  },
  getTemplate(flowId: string, request: GetFlowTemplateRequestQuery) {
    return api.get<FlowImportTemplate>(`/v1/flows/${flowId}/template`, request);
  },
  async testFlow(
    socket: Socket,
    request: TestFlowRunRequestBody,
    onUpdate: (response: FlowRun) => void,
  ) {
    socket.emit(WebsocketServerEvent.TEST_FLOW_RUN, request);
    const run = await getInitialRun(socket, request.flowVersionId);

    onUpdate(run);
    return new Promise<void>((resolve, reject) => {
      const handleProgress = (response: FlowRun) => {
        if (run.id !== response.id) {
          return;
        }
        onUpdate(response);
        if (
          response.status !== FlowRunStatus.RUNNING &&
          response.status !== FlowRunStatus.PAUSED
        ) {
          socket.off(
            WebsocketClientEvent.TEST_FLOW_RUN_PROGRESS,
            handleProgress,
          );
          socket.off('error', handleError);
          resolve();
        }
      };

      const handleError = (error: any) => {
        socket.off(WebsocketClientEvent.TEST_FLOW_RUN_PROGRESS, handleProgress);
        socket.off('error', handleError);
        reject(error);
      };

      socket.on(WebsocketClientEvent.TEST_FLOW_RUN_PROGRESS, handleProgress);
      socket.on('error', handleError);
    });
  },
  testStep(
    socket: Socket,
    request: Omit<CreateStepRunRequestBody, 'id'>,
  ): Promise<StepRunResponse> {
    const id = nanoid();
    socket.emit(WebsocketServerEvent.TEST_STEP_RUN, {
      ...request,
      id,
    });

    return new Promise<StepRunResponse>((resolve, reject) => {
      const handleStepFinished = (response: StepRunResponse) => {
        if (response.id === id) {
          socket.off(
            WebsocketClientEvent.TEST_STEP_FINISHED,
            handleStepFinished,
          );
          socket.off('error', handleError);
          resolve(response);
        }
      };

      const handleError = (error: any) => {
        socket.off(WebsocketClientEvent.TEST_STEP_FINISHED, handleStepFinished);
        socket.off('error', handleError);
        reject(error);
      };

      socket.on(WebsocketClientEvent.TEST_STEP_FINISHED, handleStepFinished);
      socket.on('error', handleError);
    });
  },
  get(
    flowId: string,
    request?: GetFlowQueryParamsRequest,
  ): Promise<PopulatedFlow> {
    return api.get<PopulatedFlow>(`/v1/flows/${flowId}`, request);
  },
  listVersions(
    flowId: string,
    request: ListFlowVersionRequest,
  ): Promise<SeekPage<FlowVersionMetadata>> {
    return api.get<SeekPage<FlowVersion>>(
      `/v1/flows/${flowId}/versions`,
      request,
    );
  },
  delete(flowId: string) {
    return api.delete<void>(`/v1/flows/${flowId}`);
  },
  count() {
    return api.get<number>('/v1/flows/count');
  },
  getStepTestOutput(flowVersionId: string, stepId: string) {
    return api
      .get<Record<string, unknown>>(
        `/v1/flow-versions/${flowVersionId}/test-output?stepIds=${stepId}`,
      )
      .then((response) => response[stepId]);
  },
};

function getInitialRun(
  socket: Socket,
  flowVersionId: string,
): Promise<FlowRun> {
  return new Promise<FlowRun>((resolve, reject) => {
    const onRunStarted = (run: FlowRun) => {
      if (run.flowVersionId !== flowVersionId) {
        return;
      }
      socket.off(WebsocketClientEvent.TEST_FLOW_RUN_STARTED, onRunStarted);
      resolve(run);
    };

    const handleError = (error: any) => {
      socket.off(WebsocketClientEvent.TEST_STEP_FINISHED, onRunStarted);
      socket.off('error', handleError);
      reject(error);
    };

    socket.on(WebsocketClientEvent.TEST_FLOW_RUN_STARTED, onRunStarted);
    socket.on('error', handleError);
  });
}
