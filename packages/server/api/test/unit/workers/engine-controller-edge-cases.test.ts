import { FastifyInstance } from 'fastify';
import { EnginePrincipal, FlowRunStatus, PrincipalType, ProgressUpdateType, GetFlowVersionForWorkerRequestType, ErrorCode, EnvironmentType } from '@openops/shared';
import { createTestApp } from '../../test-helper';
import { flowRunService } from '../../../src/app/flows/flow-run/flow-run-service';
import { flowVersionService } from '../../../src/app/flows/flow-version/flow-version.service';
import { flowService } from '../../../src/app/flows/flow/flow.service';
import { fileService } from '../../../src/app/file/file.service';
import { flowConsumer } from '../../../src/app/workers/consumer';
import { webhookResponseWatcher } from '../../../src/app/workers/helper/webhook-response-watcher';
import { flowQueue } from '../../../src/app/workers/queue';
import { triggerHooks } from '../../../src/app/flows/trigger';
import { system, SharedSystemProp } from '@openops/server-shared';
import { StatusCodes } from 'http-status-codes';

jest.mock('../../../src/app/flows/flow-run/flow-run-service');
jest.mock('../../../src/app/flows/flow-version/flow-version.service');
jest.mock('../../../src/app/flows/flow/flow.service');
jest.mock('../../../src/app/file/file.service');
jest.mock('../../../src/app/workers/consumer');
jest.mock('../../../src/app/workers/helper/webhook-response-watcher');
jest.mock('../../../src/app/workers/queue');
jest.mock('../../../src/app/flows/trigger');
jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  system: {
    getOrThrow: jest.fn(),
  },
}));

const mockFlowRunService = flowRunService as jest.Mocked<typeof flowRunService>;
const mockFlowVersionService = flowVersionService as jest.Mocked<typeof flowVersionService>;
const mockFlowService = flowService as jest.Mocked<typeof flowService>;
const mockFileService = fileService as jest.Mocked<typeof fileService>;
const mockFlowConsumer = flowConsumer as jest.Mocked<typeof flowConsumer>;
const mockWebhookResponseWatcher = webhookResponseWatcher as jest.Mocked<typeof webhookResponseWatcher>;
const mockFlowQueue = flowQueue as jest.Mocked<typeof flowQueue>;
const mockTriggerHooks = triggerHooks as jest.Mocked<typeof triggerHooks>;
const mockSystem = system as jest.Mocked<typeof system>;

describe('Engine Controller Edge Cases', () => {
  let app: FastifyInstance;
  let mockEnginePrincipal: EnginePrincipal;

  beforeEach(async () => {
    app = await createTestApp();
    mockEnginePrincipal = {
      id: 'engine-1',
      projectId: 'project-1',
      type: PrincipalType.ENGINE,
      queueToken: 'queue-token-123',
    };
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /runs/:runId - Edge Cases', () => {
    it('should handle network timeout during flow run retrieval', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockFlowRunService.getOnePopulatedOrThrow.mockRejectedValue(timeoutError);

      const response = await app.inject({
        method: 'GET',
        url: '/runs/run-1',
        headers: {
          authorization: 'Bearer engine-token',
        },
      });

      expect(response.statusCode).toBe(500);
      expect(mockFlowRunService.getOnePopulatedOrThrow).toHaveBeenCalledWith({
        id: 'run-1',
        projectId: mockEnginePrincipal.projectId,
      });
    });

    it('should handle database connection failure', async () => {
      const dbError = new Error('Database connection lost');
      dbError.name = 'ConnectionError';
      mockFlowRunService.getOnePopulatedOrThrow.mockRejectedValue(dbError);

      const response = await app.inject({
        method: 'GET',
        url: '/runs/run-1',
        headers: {
          authorization: 'Bearer engine-token',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should handle run ID with special characters', async () => {
      const runId = 'run-with-special-chars-@#$%';
      mockFlowRunService.getOnePopulatedOrThrow.mockResolvedValue({
        id: runId,
        projectId: 'project-1',
        status: FlowRunStatus.SUCCEEDED,
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: `/runs/${encodeURIComponent(runId)}`,
        headers: {
          authorization: 'Bearer engine-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockFlowRunService.getOnePopulatedOrThrow).toHaveBeenCalledWith({
        id: runId,
        projectId: mockEnginePrincipal.projectId,
      });
    });

    it('should handle extremely long run ID', async () => {
      const longRunId = 'a'.repeat(1000);
      mockFlowRunService.getOnePopulatedOrThrow.mockResolvedValue({
        id: longRunId,
        projectId: 'project-1',
        status: FlowRunStatus.SUCCEEDED,
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: `/runs/${longRunId}`,
        headers: {
          authorization: 'Bearer engine-token',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /update-job - Edge Cases', () => {
    beforeEach(() => {
      mockSystem.getOrThrow.mockReturnValue(EnvironmentType.PRODUCTION);
    });

    it('should handle missing queue token', async () => {
      const principalWithoutToken = {
        ...mockEnginePrincipal,
        queueToken: undefined,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/update-job',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          queueName: 'test-queue',
          status: 'completed',
          message: 'Job completed successfully',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should handle queue consumer failure', async () => {
      const queueError = new Error('Queue service unavailable');
      mockFlowConsumer.update.mockRejectedValue(queueError);

      const response = await app.inject({
        method: 'POST',
        url: '/update-job',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          queueName: 'test-queue',
          status: 'completed',
          message: 'Job completed successfully',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should handle missing message field', async () => {
      mockFlowConsumer.update.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/update-job',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          queueName: 'test-queue',
          status: 'completed',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockFlowConsumer.update).toHaveBeenCalledWith({
        executionCorrelationId: mockEnginePrincipal.id,
        queueName: 'test-queue',
        status: 'completed',
        message: 'NO_MESSAGE_AVAILABLE',
        token: mockEnginePrincipal.queueToken,
      });
    });

    it('should skip queue update in testing environment', async () => {
      mockSystem.getOrThrow.mockReturnValue(EnvironmentType.TESTING);

      const response = await app.inject({
        method: 'POST',
        url: '/update-job',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          queueName: 'test-queue',
          status: 'completed',
          message: 'Job completed successfully',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockFlowConsumer.update).not.toHaveBeenCalled();
    });

    it('should handle queue name with special characters', async () => {
      const specialQueueName = 'queue-with-@#$%-chars';
      mockFlowConsumer.update.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/update-job',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          queueName: specialQueueName,
          status: 'completed',
          message: 'Test message',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockFlowConsumer.update).toHaveBeenCalledWith({
        executionCorrelationId: mockEnginePrincipal.id,
        queueName: specialQueueName,
        status: 'completed',
        message: 'Test message',
        token: mockEnginePrincipal.queueToken,
      });
    });
  });

  describe('POST /update-run - Edge Cases', () => {
    beforeEach(() => {
      mockFlowRunService.updateStatus.mockResolvedValue({
        id: 'run-1',
        projectId: 'project-1',
        status: FlowRunStatus.SUCCEEDED,
      } as any);
    });

    it('should handle concurrent run updates', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/update-run',
          headers: {
            authorization: 'Bearer engine-token',
          },
          payload: {
            runId: 'run-1',
            executionCorrelationId: `correlation-${i}`,
            runDetails: {
              status: FlowRunStatus.RUNNING,
              tasks: i,
              duration: 1000 + i * 100,
              steps: {},
            },
          },
        })
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
      expect(mockFlowRunService.updateStatus).toHaveBeenCalledTimes(5);
    });

    it('should handle update with malformed steps data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/update-run',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          runId: 'run-1',
          executionCorrelationId: 'correlation-1',
          runDetails: {
            status: FlowRunStatus.SUCCEEDED,
            tasks: 1,
            duration: 1000,
            steps: {
              'step-1': null,
              'step-2': undefined,
              'step-3': 'invalid-step-data',
            },
          },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockFlowRunService.updateStatus).toHaveBeenCalledWith({
        flowRunId: 'run-1',
        status: FlowRunStatus.SUCCEEDED,
        tasks: 1,
        duration: 1000,
        executionState: {
          steps: {
            'step-1': null,
            'step-2': undefined,
            'step-3': 'invalid-step-data',
          },
        },
        projectId: mockEnginePrincipal.projectId,
        tags: [],
      });
    });

    it('should handle webhook response with large payload', async () => {
      const largePauseMetadata = {
        response: {
          data: 'x'.repeat(10000),
          metadata: {
            size: 10000,
            timestamp: Date.now(),
          },
        },
      };

      mockWebhookResponseWatcher.publish.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/update-run',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          runId: 'run-1',
          executionCorrelationId: 'correlation-1',
          workerHandlerId: 'worker-1',
          progressUpdateType: ProgressUpdateType.WEBHOOK_RESPONSE,
          runDetails: {
            status: FlowRunStatus.PAUSED,
            tasks: 1,
            duration: 1000,
            steps: {},
            pauseMetadata: largePauseMetadata,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockWebhookResponseWatcher.publish).toHaveBeenCalledWith(
        'correlation-1',
        'worker-1',
        {
          status: StatusCodes.OK,
          body: largePauseMetadata.response,
          headers: {},
        }
      );
    });

    it('should handle paused run with missing pause metadata', async () => {
      mockFlowRunService.pause.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/update-run',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          runId: 'run-1',
          executionCorrelationId: 'correlation-1',
          runDetails: {
            status: FlowRunStatus.PAUSED,
            tasks: 1,
            duration: 1000,
            steps: {},
          },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockFlowRunService.pause).toHaveBeenCalledWith({
        flowRunId: 'run-1',
        pauseMetadata: {
          progressUpdateType: ProgressUpdateType.NONE,
          handlerId: undefined,
          executionCorrelationId: 'correlation-1',
        },
      });
    });

    it('should handle run update with timeout and internal error statuses', async () => {
      const timeoutResponse = await app.inject({
        method: 'POST',
        url: '/update-run',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          runId: 'run-1',
          executionCorrelationId: 'correlation-1',
          runDetails: {
            status: FlowRunStatus.TIMEOUT,
            tasks: 1,
            duration: 1000,
            steps: {},
          },
        },
      });

      expect(timeoutResponse.statusCode).toBe(200);
      expect(mockFlowRunService.updateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          executionState: null,
        })
      );

      const internalErrorResponse = await app.inject({
        method: 'POST',
        url: '/update-run',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          runId: 'run-2',
          executionCorrelationId: 'correlation-2',
          runDetails: {
            status: FlowRunStatus.INTERNAL_ERROR,
            tasks: 1,
            duration: 1000,
            steps: {},
          },
        },
      });

      expect(internalErrorResponse.statusCode).toBe(200);
      expect(mockFlowRunService.updateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          executionState: null,
        })
      );
    });

    it('should handle websocket emission failure', async () => {
      app.io = {
        to: jest.fn().mockReturnValue({
          emit: jest.fn().mockImplementation(() => {
            throw new Error('WebSocket connection failed');
          }),
        }),
      } as any;

      const response = await app.inject({
        method: 'POST',
        url: '/update-run',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          runId: 'run-1',
          executionCorrelationId: 'correlation-1',
          runDetails: {
            status: FlowRunStatus.SUCCEEDED,
            tasks: 1,
            duration: 1000,
            steps: {},
          },
        },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('GET /flows - Edge Cases', () => {
    it('should handle locked flow request when no published version exists', async () => {
      mockFlowService.getOneOrThrow.mockResolvedValue({
        id: 'flow-1',
        projectId: 'project-1',
        publishedVersionId: null,
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: '/flows',
        query: {
          type: GetFlowVersionForWorkerRequestType.LOCKED,
          flowId: 'flow-1',
        },
        headers: {
          authorization: 'Bearer engine-token',
        },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual(
        expect.objectContaining({
          code: ErrorCode.ENTITY_NOT_FOUND,
        })
      );
    });

    it('should handle flow version locking failure', async () => {
      mockFlowService.getOnePopulatedOrThrow.mockResolvedValue({
        id: 'flow-1',
        projectId: 'project-1',
        version: {
          id: 'version-1',
          flowId: 'flow-1',
        },
      } as any);

      const lockError = new Error('Block version locking failed');
      mockFlowVersionService.lockBlockVersions.mockRejectedValue(lockError);

      const response = await app.inject({
        method: 'GET',
        url: '/flows',
        query: {
          type: GetFlowVersionForWorkerRequestType.LATEST,
          flowId: 'flow-1',
        },
        headers: {
          authorization: 'Bearer engine-token',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should handle exact version request with invalid version ID', async () => {
      const versionError = new Error('Flow version not found');
      mockFlowVersionService.getOneOrThrow.mockRejectedValue(versionError);

      const response = await app.inject({
        method: 'GET',
        url: '/flows',
        query: {
          type: GetFlowVersionForWorkerRequestType.EXACT,
          versionId: 'invalid-version-id',
        },
        headers: {
          authorization: 'Bearer engine-token',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should handle flow retrieval with circular dependency', async () => {
      const circularError = new Error('Circular dependency detected');
      mockFlowService.getOnePopulatedOrThrow.mockRejectedValue(circularError);

      const response = await app.inject({
        method: 'GET',
        url: '/flows',
        query: {
          type: GetFlowVersionForWorkerRequestType.LATEST,
          flowId: 'circular-flow',
        },
        headers: {
          authorization: 'Bearer engine-token',
        },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('POST /remove-stale-job - Edge Cases', () => {
    it('should handle stale job removal when flow is null', async () => {
      mockFlowService.getOnePopulated.mockResolvedValue(null);
      mockFlowQueue.removeRepeatingJob.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/remove-stale-job',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          flowVersionId: 'version-1',
          flowId: 'flow-1',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockFlowQueue.removeRepeatingJob).toHaveBeenCalledWith({
        flowVersionId: 'version-1',
      });
      expect(mockTriggerHooks.disable).not.toHaveBeenCalled();
    });

    it('should handle trigger hook disable failure', async () => {
      mockFlowService.getOnePopulated.mockResolvedValue({
        id: 'flow-1',
        projectId: 'project-1',
        version: {
          id: 'version-1',
          flowId: 'flow-1',
        },
      } as any);

      const hookError = new Error('Trigger hook disable failed');
      mockTriggerHooks.disable.mockRejectedValue(hookError);

      const response = await app.inject({
        method: 'POST',
        url: '/remove-stale-job',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          flowVersionId: 'version-1',
          flowId: 'flow-1',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should handle removal with missing flow ID', async () => {
      mockFlowQueue.removeRepeatingJob.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/remove-stale-job',
        headers: {
          authorization: 'Bearer engine-token',
        },
        payload: {
          flowVersionId: 'version-1',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockFlowQueue.removeRepeatingJob).toHaveBeenCalledWith({
        flowVersionId: 'version-1',
      });
      expect(mockFlowService.getOnePopulated).not.toHaveBeenCalled();
    });
  });

  describe('GET /files/:fileId - Edge Cases', () => {
    it('should handle file not found', async () => {
      const fileError = new Error('File not found');
      mockFileService.getOneOrThrow.mockRejectedValue(fileError);

      const response = await app.inject({
        method: 'GET',
        url: '/files/non-existent-file',
        headers: {
          authorization: 'Bearer engine-token',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should handle corrupted file data', async () => {
      mockFileService.getOneOrThrow.mockResolvedValue({
        id: 'file-1',
        data: null,
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: '/files/file-1',
        headers: {
          authorization: 'Bearer engine-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/zip');
    });

    it('should handle extremely large file', async () => {
      const largeFileData = Buffer.alloc(100 * 1024 * 1024); // 100MB
      mockFileService.getOneOrThrow.mockResolvedValue({
        id: 'large-file',
        data: largeFileData,
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: '/files/large-file',
        headers: {
          authorization: 'Bearer engine-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/zip');
    });

    it('should handle file with special characters in ID', async () => {
      const specialFileId = 'file-with-@#$%-chars';
      mockFileService.getOneOrThrow.mockResolvedValue({
        id: specialFileId,
        data: Buffer.from('test data'),
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: `/files/${encodeURIComponent(specialFileId)}`,
        headers: {
          authorization: 'Bearer engine-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockFileService.getOneOrThrow).toHaveBeenCalledWith({
        fileId: specialFileId,
      });
    });
  });

  describe('Error Response Generation', () => {
    it('should handle all flow status types in getFlowResponse', async () => {
      const testCases = [
        {
          status: FlowRunStatus.PAUSED,
          pauseMetadata: { response: { data: 'test' } },
          expected: { status: StatusCodes.OK, body: { data: 'test' }, headers: {} },
        },
        {
          status: FlowRunStatus.PAUSED,
          pauseMetadata: undefined,
          expected: { status: StatusCodes.NO_CONTENT, body: {}, headers: {} },
        },
        {
          status: FlowRunStatus.STOPPED,
          stopResponse: { status: StatusCodes.ACCEPTED, body: { message: 'stopped' }, headers: { 'x-test': 'value' } },
          expected: { status: StatusCodes.ACCEPTED, body: { message: 'stopped' }, headers: { 'x-test': 'value' } },
        },
        {
          status: FlowRunStatus.INTERNAL_ERROR,
          expected: { status: StatusCodes.INTERNAL_SERVER_ERROR, body: { message: 'An internal error has occurred' }, headers: {} },
        },
        {
          status: FlowRunStatus.FAILED,
          expected: { status: StatusCodes.INTERNAL_SERVER_ERROR, body: { message: 'The flow has failed and there is no response returned' }, headers: {} },
        },
        {
          status: FlowRunStatus.TIMEOUT,
          expected: { status: StatusCodes.GATEWAY_TIMEOUT, body: { message: 'The request took too long to reply' }, headers: {} },
        },
        {
          status: FlowRunStatus.RUNNING,
          expected: { status: StatusCodes.GATEWAY_TIMEOUT, body: { message: 'The request took too long to reply' }, headers: {} },
        },
        {
          status: FlowRunStatus.SUCCEEDED,
          expected: { status: StatusCodes.NO_CONTENT, body: {}, headers: {} },
        },
      ];

      for (const testCase of testCases) {
        mockWebhookResponseWatcher.publish.mockResolvedValue(undefined);

        const response = await app.inject({
          method: 'POST',
          url: '/update-run',
          headers: {
            authorization: 'Bearer engine-token',
          },
          payload: {
            runId: 'run-1',
            executionCorrelationId: 'correlation-1',
            workerHandlerId: 'worker-1',
            progressUpdateType: ProgressUpdateType.WEBHOOK_RESPONSE,
            runDetails: {
              status: testCase.status,
              tasks: 1,
              duration: 1000,
              steps: {},
              pauseMetadata: testCase.pauseMetadata,
              stopResponse: testCase.stopResponse,
            },
          },
        });

        expect(response.statusCode).toBe(200);
        if (testCase.expected) {
          expect(mockWebhookResponseWatcher.publish).toHaveBeenCalledWith(
            'correlation-1',
            'worker-1',
            testCase.expected
          );
        }
      }
    });
  });
});