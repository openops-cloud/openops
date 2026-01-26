jest.mock('../../../src/app/flows/flow-run/flow-run-service', () => ({
  flowRunService: {
    updateStatus: jest.fn(),
    pause: jest.fn(),
  },
}));

jest.mock('../../../src/app/workers/helper/webhook-response-watcher', () => ({
  webhookResponseWatcher: {
    publish: jest.fn(),
  },
}));

jest.mock('../../../src/app/authentication/authorization', () => ({
  entitiesMustBeOwnedByCurrentProject: jest.fn(),
}));

const mockWorkflowDeletionRequested = jest.fn().mockReturnValue(false);
jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  wasWorkflowDeletionRequested: mockWorkflowDeletionRequested,
}));

import {
  FlowRunStatus,
  PrincipalType,
  ProgressUpdateType,
  WebsocketClientEvent,
} from '@openops/shared';
import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { flowRunService } from '../../../src/app/flows/flow-run/flow-run-service';
import { flowEngineWorker } from '../../../src/app/workers/engine-controller';
import { webhookResponseWatcher } from '../../../src/app/workers/helper/webhook-response-watcher';

describe('Engine Controller - update-run endpoint', () => {
  type RouteHandler = (
    req: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<void>;

  let handlers: Record<string, RouteHandler> = {};
  const mockIo = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  const mockApp = {
    post: jest.fn((path: string, _: unknown, handler: RouteHandler) => {
      handlers[path] = handler;
      return mockApp;
    }),
    get: jest.fn((path: string, _: unknown, handler: RouteHandler) => {
      handlers[path] = handler;
      return mockApp;
    }),
    addHook: jest.fn(),
    io: mockIo,
  } as unknown as FastifyInstance;

  const mockReply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };

  const mockEnginePrincipal = {
    id: 'test-execution-id',
    projectId: 'test-project-id',
    type: PrincipalType.ENGINE,
    queueToken: 'test-queue-token',
  };

  const mockPopulatedRun = {
    id: 'test-run-id',
    status: FlowRunStatus.SUCCEEDED,
    projectId: 'test-project-id',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    handlers = {};

    (flowRunService.updateStatus as jest.Mock).mockResolvedValue(
      mockPopulatedRun,
    );
    (flowRunService.pause as jest.Mock).mockResolvedValue({});
    (webhookResponseWatcher.publish as jest.Mock).mockResolvedValue({});

    await flowEngineWorker(mockApp, {} as FastifyPluginOptions);
  });

  describe('POST /update-run', () => {
    const baseRequest = {
      body: {
        executionCorrelationId: 'test-correlation-id',
        runId: 'test-run-id',
        workerHandlerId: 'test-handler-id',
        runDetails: {
          status: FlowRunStatus.SUCCEEDED,
          tasks: [],
          duration: 1000,
          steps: { step1: { result: 'success' } },
        },
      },
      principal: mockEnginePrincipal,
    };

    it('should handle successful flow run update', async () => {
      const updateRunHandler = handlers['/update-run'];
      expect(updateRunHandler).toBeDefined();

      await updateRunHandler(
        baseRequest as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(flowRunService.updateStatus).toHaveBeenCalledWith({
        flowRunId: 'test-run-id',
        status: FlowRunStatus.SUCCEEDED,
        tasks: [],
        duration: 1000,
        executionState: {
          steps: { step1: { result: 'success' } },
        },
        projectId: 'test-project-id',
        tags: [],
      });
    });

    it('should skip update if workflow deletion was requested', async () => {
      mockWorkflowDeletionRequested.mockReturnValue(true);
      const updateRunHandler = handlers['/update-run'];
      expect(updateRunHandler).toBeDefined();

      await updateRunHandler(
        baseRequest as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(flowRunService.updateStatus).not.toHaveBeenCalled();
    });

    it('should handle STOPPED status', async () => {
      const request = {
        ...baseRequest,
        body: {
          ...baseRequest.body,
          runDetails: {
            ...baseRequest.body.runDetails,
            status: FlowRunStatus.STOPPED,
          },
        },
      };

      const updateRunHandler = handlers['/update-run'];
      await updateRunHandler(
        request as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(flowRunService.updateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          status: FlowRunStatus.STOPPED,
        }),
      );
    });

    it('should handle FAILED status', async () => {
      const request = {
        ...baseRequest,
        body: {
          ...baseRequest.body,
          runDetails: {
            ...baseRequest.body.runDetails,
            status: FlowRunStatus.FAILED,
            error: { message: 'Test error' },
          },
        },
      };

      (flowRunService.updateStatus as jest.Mock).mockResolvedValue({
        ...mockPopulatedRun,
        status: FlowRunStatus.FAILED,
      });

      const updateRunHandler = handlers['/update-run'];
      await updateRunHandler(
        request as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(flowRunService.updateStatus).toHaveBeenCalledWith({
        flowRunId: 'test-run-id',
        status: FlowRunStatus.FAILED,
        tasks: [],
        duration: 1000,
        executionState: {
          steps: { step1: { result: 'success' } },
        },
        projectId: 'test-project-id',
        tags: [],
      });
    });

    it('should handle INTERNAL_ERROR status', async () => {
      const testError = { message: 'Internal error occurred' };
      const request = {
        ...baseRequest,
        body: {
          ...baseRequest.body,
          runDetails: {
            ...baseRequest.body.runDetails,
            status: FlowRunStatus.INTERNAL_ERROR,
            error: testError,
          },
        },
      };

      (flowRunService.updateStatus as jest.Mock).mockResolvedValue({
        ...mockPopulatedRun,
        status: FlowRunStatus.INTERNAL_ERROR,
      });

      const updateRunHandler = handlers['/update-run'];
      await updateRunHandler(
        request as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(flowRunService.updateStatus).toHaveBeenCalledWith({
        flowRunId: 'test-run-id',
        status: FlowRunStatus.INTERNAL_ERROR,
        tasks: [],
        duration: 1000,
        executionState: null,
        projectId: 'test-project-id',
        tags: [],
      });
    });

    it('should handle TIMEOUT status with null execution state', async () => {
      const request = {
        ...baseRequest,
        body: {
          ...baseRequest.body,
          runDetails: {
            ...baseRequest.body.runDetails,
            status: FlowRunStatus.TIMEOUT,
          },
        },
      };

      const updateRunHandler = handlers['/update-run'];
      await updateRunHandler(
        request as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(flowRunService.updateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          executionState: null, // TIMEOUT should have null execution state
        }),
      );
    });

    it('should emit FLOW_RUN_PROGRESS for test flows', async () => {
      const request = {
        ...baseRequest,
        body: {
          ...baseRequest.body,
          progressUpdateType: ProgressUpdateType.TEST_FLOW,
        },
      };

      const updateRunHandler = handlers['/update-run'];
      await updateRunHandler(
        request as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockIo.to).toHaveBeenCalledWith('test-project-id');
      expect(mockIo.emit).toHaveBeenCalledWith(
        WebsocketClientEvent.FLOW_RUN_PROGRESS,
        'test-run-id',
      );
    });

    describe('PAUSED status handling', () => {
      it('should handle PAUSED status with pause metadata', async () => {
        const pauseMetadata = {
          response: { message: 'Paused for input' },
          executionCorrelationId: 'pause-correlation-id',
        };

        const request = {
          ...baseRequest,
          body: {
            ...baseRequest.body,
            runDetails: {
              ...baseRequest.body.runDetails,
              status: FlowRunStatus.PAUSED,
              pauseMetadata,
            },
            progressUpdateType: ProgressUpdateType.TEST_FLOW,
          },
        };

        const updateRunHandler = handlers['/update-run'];
        await updateRunHandler(
          request as unknown as FastifyRequest,
          mockReply as unknown as FastifyReply,
        );

        expect(flowRunService.pause).toHaveBeenCalledWith({
          flowRunId: 'test-run-id',
          pauseMetadata: {
            ...pauseMetadata,
            progressUpdateType: ProgressUpdateType.TEST_FLOW,
            handlerId: 'test-handler-id',
            executionCorrelationId: 'pause-correlation-id',
          },
        });
      });

      it('should handle PAUSED status without pause metadata', async () => {
        const request = {
          ...baseRequest,
          body: {
            ...baseRequest.body,
            runDetails: {
              ...baseRequest.body.runDetails,
              status: FlowRunStatus.PAUSED,
              pauseMetadata: null,
            },
          },
        };

        const updateRunHandler = handlers['/update-run'];
        await updateRunHandler(
          request as unknown as FastifyRequest,
          mockReply as unknown as FastifyReply,
        );

        expect(flowRunService.pause).toHaveBeenCalledWith({
          flowRunId: 'test-run-id',
          pauseMetadata: {
            progressUpdateType: ProgressUpdateType.NONE,
            handlerId: 'test-handler-id',
            executionCorrelationId: 'test-correlation-id',
          },
        });
      });
    });

    describe('should not publish webhook response', () => {
      it('should not publish for RUNNING status', async () => {
        const request = {
          ...baseRequest,
          body: {
            ...baseRequest.body,
            runDetails: {
              status: FlowRunStatus.RUNNING,
              tasks: [],
              duration: 1000,
              steps: { step1: { result: 'success' } },
            },
          },
        };

        const updateRunHandler = handlers['/update-run'];
        await updateRunHandler(
          request as unknown as FastifyRequest,
          mockReply as unknown as FastifyReply,
        );

        expect(webhookResponseWatcher.publish).not.toHaveBeenCalled();
      });

      it('should not publish when workerHandlerId is null', async () => {
        const request = {
          ...baseRequest,
          body: {
            ...baseRequest.body,
            workerHandlerId: null,
            runDetails: {
              status: FlowRunStatus.FAILED,
              tasks: [],
              duration: 1000,
              steps: { step1: { result: 'success' } },
            },
          },
        };

        const updateRunHandler = handlers['/update-run'];
        await updateRunHandler(
          request as unknown as FastifyRequest,
          mockReply as unknown as FastifyReply,
        );

        expect(webhookResponseWatcher.publish).not.toHaveBeenCalled();
      });

      it('should not publish when executionCorrelationId is null', async () => {
        const request = {
          ...baseRequest,
          body: {
            ...baseRequest.body,
            executionCorrelationId: null,
            runDetails: {
              status: FlowRunStatus.FAILED,
              tasks: [],
              duration: 1000,
              steps: { step1: { result: 'success' } },
            },
          },
        };

        const updateRunHandler = handlers['/update-run'];
        await updateRunHandler(
          request as unknown as FastifyRequest,
          mockReply as unknown as FastifyReply,
        );

        expect(webhookResponseWatcher.publish).not.toHaveBeenCalled();
      });
    });

    describe('Edge cases for different FlowRunStatus values', () => {
      const statusTestCases = [
        {
          status: FlowRunStatus.SCHEDULED,
        },
        {
          status: FlowRunStatus.IGNORED,
        },
        {
          status: FlowRunStatus.RUNNING,
        },
        {
          status: FlowRunStatus.PAUSED,
        },
      ];

      statusTestCases.forEach(({ status }) => {
        it(`should handle ${status} status correctly`, async () => {
          const request = {
            ...baseRequest,
            body: {
              ...baseRequest.body,
              runDetails: {
                ...baseRequest.body.runDetails,
                status,
              },
            },
          };

          (flowRunService.updateStatus as jest.Mock).mockResolvedValue({
            ...mockPopulatedRun,
            status,
          });

          const updateRunHandler = handlers['/update-run'];
          await updateRunHandler(
            request as unknown as FastifyRequest,
            mockReply as unknown as FastifyReply,
          );

          expect(flowRunService.updateStatus).toHaveBeenCalledWith({
            flowRunId: 'test-run-id',
            status,
            tasks: [],
            duration: 1000,
            executionState: {
              steps: { step1: { result: 'success' } },
            },
            projectId: 'test-project-id',
            tags: [],
          });
        });
      });
    });

    describe('getFlowResponse test cases', () => {
      const flowResponseTestCases = [
        {
          status: FlowRunStatus.PAUSED,
          pauseMetadata: { response: { data: 'test' } },
          expected: {
            status: StatusCodes.OK,
            body: { data: 'test' },
            headers: {},
          },
        },
        {
          status: FlowRunStatus.PAUSED,
          pauseMetadata: null,
          expected: {
            status: StatusCodes.NO_CONTENT,
            body: {},
            headers: {},
          },
        },
        {
          status: FlowRunStatus.STOPPED,
          stopResponse: {
            status: StatusCodes.ACCEPTED,
            body: { message: 'stopped' },
            headers: { 'custom-header': 'value' },
          },
          expected: {
            status: StatusCodes.ACCEPTED,
            body: { message: 'stopped' },
            headers: { 'custom-header': 'value' },
          },
        },
        {
          status: FlowRunStatus.STOPPED,
          stopResponse: null,
          expected: {
            status: StatusCodes.OK,
            body: undefined,
            headers: {},
          },
        },
        {
          status: FlowRunStatus.INTERNAL_ERROR,
          expected: {
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            body: { message: 'An internal error has occurred' },
            headers: {},
          },
        },
        {
          status: FlowRunStatus.FAILED,
          expected: {
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            body: {
              message: 'The flow has failed and there is no response returned',
            },
            headers: {},
          },
        },
        {
          status: FlowRunStatus.TIMEOUT,
          expected: {
            status: StatusCodes.GATEWAY_TIMEOUT,
            body: { message: 'The request took too long to reply' },
            headers: {},
          },
        },
        {
          status: FlowRunStatus.SUCCEEDED,
          expected: {
            status: StatusCodes.NO_CONTENT,
            body: {},
            headers: {},
          },
        },
      ];

      flowResponseTestCases.forEach(({ status, expected, ...responseData }) => {
        it(`should generate correct flow response for ${status}`, async () => {
          const request = {
            ...baseRequest,
            body: {
              ...baseRequest.body,
              progressUpdateType: ![
                'RUNNING',
                'SUCCEEDED',
                'PAUSED',
                'STOPPED',
              ].includes(status)
                ? ProgressUpdateType.WEBHOOK_RESPONSE
                : ProgressUpdateType.NONE,
              runDetails: {
                ...baseRequest.body.runDetails,
                status,
                ...responseData,
              },
            },
          };

          const updateRunHandler = handlers['/update-run'];
          await updateRunHandler(
            request as unknown as FastifyRequest,
            mockReply as unknown as FastifyReply,
          );

          if (!['RUNNING', 'SUCCEEDED', 'PAUSED', 'STOPPED'].includes(status)) {
            expect(webhookResponseWatcher.publish).toHaveBeenCalledWith(
              'test-run-id',
              'test-handler-id',
              expected,
            );
          }
        });
      });
    });

    describe('Additional edge cases', () => {
      describe('PAUSED status edge cases', () => {
        it.each([
          {
            name: 'with executionCorrelationId from pauseMetadata',
            requestOverrides: {
              executionCorrelationId: 'original-correlation-id',
            },
            pauseMetadata: {
              response: { message: 'Paused for input' },
              executionCorrelationId: 'custom-pause-correlation-id',
            },
            expectedExecutionCorrelationId: 'custom-pause-correlation-id',
            expectedHandlerId: 'test-handler-id',
          },
          {
            name: 'with missing executionCorrelationId in pauseMetadata',
            requestOverrides: {
              executionCorrelationId: 'fallback-correlation-id',
            },
            pauseMetadata: {
              response: { message: 'Paused for input' },
            },
            expectedExecutionCorrelationId: 'fallback-correlation-id',
            expectedHandlerId: 'test-handler-id',
          },
          {
            name: 'with undefined workerHandlerId',
            requestOverrides: {
              workerHandlerId: undefined,
            },
            pauseMetadata: {
              response: { message: 'Paused for input' },
              executionCorrelationId: 'pause-correlation-id',
            },
            expectedExecutionCorrelationId: 'pause-correlation-id',
            expectedHandlerId: undefined,
          },
        ])(
          'should handle PAUSED status $name',
          async ({
            requestOverrides,
            pauseMetadata,
            expectedExecutionCorrelationId,
            expectedHandlerId,
          }) => {
            const request = {
              ...baseRequest,
              body: {
                ...baseRequest.body,
                ...requestOverrides,
                runDetails: {
                  ...baseRequest.body.runDetails,
                  status: FlowRunStatus.PAUSED,
                  pauseMetadata,
                },
              },
            };

            const updateRunHandler = handlers['/update-run'];
            await updateRunHandler(
              request as unknown as FastifyRequest,
              mockReply as unknown as FastifyReply,
            );

            expect(flowRunService.pause).toHaveBeenCalledWith({
              flowRunId: 'test-run-id',
              pauseMetadata: {
                ...pauseMetadata,
                progressUpdateType: ProgressUpdateType.NONE,
                handlerId: expectedHandlerId,
                executionCorrelationId: expectedExecutionCorrelationId,
              },
            });
          },
        );
      });

      it('should handle complex error object in INTERNAL_ERROR', async () => {
        const complexError = {
          message: 'Complex error',
          code: 'ERR_COMPLEX',
          details: {
            nested: { value: 'test' },
            array: [1, 2, 3],
          },
        };

        const request = {
          ...baseRequest,
          body: {
            ...baseRequest.body,
            runDetails: {
              ...baseRequest.body.runDetails,
              status: FlowRunStatus.INTERNAL_ERROR,
              error: complexError,
            },
          },
        };

        (flowRunService.updateStatus as jest.Mock).mockResolvedValue({
          ...mockPopulatedRun,
          status: FlowRunStatus.INTERNAL_ERROR,
        });

        const updateRunHandler = handlers['/update-run'];
        await updateRunHandler(
          request as unknown as FastifyRequest,
          mockReply as unknown as FastifyReply,
        );

        expect(flowRunService.updateStatus).toHaveBeenCalledWith({
          flowRunId: 'test-run-id',
          status: FlowRunStatus.INTERNAL_ERROR,
          tasks: [],
          duration: 1000,
          executionState: null,
          projectId: 'test-project-id',
          tags: [],
        });
      });
    });
  });
});
