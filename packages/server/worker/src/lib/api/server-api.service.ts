import { BlockMetadataModel } from '@openops/blocks-framework';
import {
  DeleteWebhookSimulationRequest,
  GetRunForWorkerRequest,
  networkUtls,
  PollJobRequest,
  QueueJob,
  QueueName,
  ResumeRunRequest,
  SavePayloadRequest,
  SendWebhookUpdateRequest,
  SubmitPayloadRequest,
  SubmitPayloadsRequest,
  UpdateFailureCountRequest,
  UpdateJobRequest,
} from '@openops/server-shared';
import {
  FlowRun,
  GetBlockRequestQuery,
  GetFlowVersionForWorkerRequest,
  PopulatedFlow,
  Project,
  RemoveStableJobEngineRequest,
  UpdateRunProgressRequest,
  WorkerMachineHealthcheckRequest,
} from '@openops/shared';
import { heartbeat } from '../utils/heartbeat';
import { AxiosClient } from './axios-client';

const removeTrailingSlash = (url: string): string => {
  return url.endsWith('/') ? url.slice(0, -1) : url;
};
const apiUrl = removeTrailingSlash(networkUtls.getInternalApiUrl());

export const workerApiService = (workerToken: string) => {
  const client = new AxiosClient(apiUrl, workerToken);

  return {
    async heartbeat(): Promise<void> {
      const request: WorkerMachineHealthcheckRequest =
        await heartbeat.getSystemInfo();
      await client.post('/v1/worker-machines/heartbeat', request);
    },
    async poll(queueName: QueueName): Promise<QueueJob | null> {
      try {
        const request: PollJobRequest = {
          queueName,
        };
        const response = await client.get<QueueJob | null>('/v1/workers/poll', {
          params: request,
        });
        return response;
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return null;
      }
    },
    async resumeRun(request: ResumeRunRequest): Promise<void> {
      await client.post<unknown>('/v1/workers/resume-run', request);
    },
    async deleteWebhookSimulation(
      request: DeleteWebhookSimulationRequest,
    ): Promise<void> {
      await client.post('/v1/workers/delete-webhook-simulation', request);
    },
    async savePayloadsAsSampleData(request: SavePayloadRequest): Promise<void> {
      await client.post('/v1/workers/save-payloads', request);
    },
    async startRuns(request: SubmitPayloadsRequest): Promise<FlowRun[]> {
      return client.post<FlowRun[]>('/v1/workers/submit-payloads', request);
    },
    async startRun(request: SubmitPayloadRequest): Promise<FlowRun> {
      return client.post<FlowRun>('/v1/workers/submit-payload', request);
    },
    async sendWebhookUpdate(request: SendWebhookUpdateRequest): Promise<void> {
      await client.post('/v1/workers/send-webhook-update', request);
    },
  };
};

export const engineApiService = (engineToken: string) => {
  const client = new AxiosClient(apiUrl, engineToken);

  return {
    async getFile(fileId: string): Promise<Buffer> {
      return client.get<Buffer>(`/v1/engine/files/${fileId}`, {
        responseType: 'arraybuffer',
      });
    },
    async updateJobStatus(request: UpdateJobRequest): Promise<void> {
      await client.post('/v1/engine/update-job', request);
    },
    async updateFailureCount(
      request: UpdateFailureCountRequest,
    ): Promise<void> {
      await client.post('/v1/engine/update-failure-count', request);
    },
    async getRun(request: GetRunForWorkerRequest): Promise<FlowRun> {
      return client.get<FlowRun>('/v1/engine/runs/' + request.runId, {});
    },
    async updateRunStatus(request: UpdateRunProgressRequest): Promise<void> {
      await client.post('/v1/engine/update-run', request);
    },
    async removeStaleFlow(
      request: RemoveStableJobEngineRequest,
    ): Promise<void> {
      await client.post('/v1/engine/remove-stale-job', request);
    },
    async getBlock(
      name: string,
      options: GetBlockRequestQuery,
    ): Promise<BlockMetadataModel> {
      return client.get<BlockMetadataModel>(
        `/v1/blocks/${encodeURIComponent(name)}`,
        {
          params: options,
        },
      );
    },
    async getFlowWithExactBlocks(
      request: GetFlowVersionForWorkerRequest,
    ): Promise<PopulatedFlow | null> {
      try {
        return await client.get<PopulatedFlow | null>('/v1/engine/flows', {
          params: request,
        });
      } catch (e) {
        if (
          AxiosClient.isApplicationAxiosError(e) &&
          e.error.response &&
          e.error.response.status === 404
        ) {
          return null;
        }
        throw e;
      }
    },
  };
};
