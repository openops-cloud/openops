const saveRequestBodyMock = jest.fn();
import { progressService } from '../../src/lib/services/progress.service';
import { throwIfExecutionTimeExceeded } from '../../src/lib/timeout-validator';

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  saveRequestBody: saveRequestBodyMock,
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../src/lib/timeout-validator', () => ({
  throwIfExecutionTimeExceeded: jest.fn(),
}));

jest.mock('@openops/common', () => ({
  makeHttpRequest: jest.fn(),
}));

const mockThrowIfExecutionTimeExceeded = throwIfExecutionTimeExceeded as jest.MockedFunction<typeof throwIfExecutionTimeExceeded>;
const mockMakeHttpRequest = require('@openops/common').makeHttpRequest as jest.MockedFunction<any>;

describe('Progress Service', () => {
  const mockParams = {
    engineConstants: {
      internalApiUrl: 'http://localhost:3000/',
      executionCorrelationId: 'test-correlation-id',
      flowRunId: 'test-run-id',
      serverHandlerId: 'test-handler-id',
      engineToken: 'test-token',
      progressUpdateType: 'WEBHOOK_RESPONSE',
    },
    flowExecutorContext: {
      toResponse: jest.fn().mockResolvedValue({
        steps: {},
        status: 'RUNNING',
        duration: 1000,
        tasks: 1,
      }),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the timeout mock to not throw by default
    mockThrowIfExecutionTimeExceeded.mockReset();

    mockMakeHttpRequest.mockResolvedValue({});

    // Reset the global lastRequestHash by calling with unique params
    // This ensures no deduplication issues between tests
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sendUpdate', () => {
    it('should send progress update successfully', async () => {
      const successParams = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-success',
        },
      };

      saveRequestBodyMock.mockResolvedValue('request:test-run-id');
<<<<<<< HEAD
      progressService.sendUpdate(successParams);
      await progressService.flushProgressUpdate(successParams.engineConstants.flowRunId);

      expect(saveRequestBodyMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        executionCorrelationId: 'test-correlation-id-success',
        runId: 'test-run-id',
        workerHandlerId: 'test-handler-id',
        progressUpdateType: 'WEBHOOK_RESPONSE',
      }));
=======
      await progressService.sendUpdate(successParams);
>>>>>>> main

      expect(saveRequestBodyMock).toHaveBeenCalledWith('test-run-id', expect.objectContaining({
        executionCorrelationId: 'test-correlation-id-success',
        runId: 'test-run-id',
        workerHandlerId: 'test-handler-id',
        progressUpdateType: 'WEBHOOK_RESPONSE',
      }));

      expect(successParams.flowExecutorContext.toResponse).toHaveBeenCalled();
      expect(mockMakeHttpRequest).toHaveBeenCalledWith(
        'POST',
        'http://localhost:3000/v1/engine/update-run',
        expect.any(Object),
        expect.objectContaining({
          bodyAccessKey: 'request:test-run-id',
        }),
        expect.objectContaining({
          retries: 3,
          retryDelay: expect.any(Function),
        })
      );
    });

    it('should build correct request payload', async () => {
      const uniqueParams = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-payload',
        },
      };

      saveRequestBodyMock.mockResolvedValue('request:test-run-id');
<<<<<<< HEAD
      progressService.sendUpdate(uniqueParams);
      await progressService.flushProgressUpdate(uniqueParams.engineConstants.flowRunId);

      expect(saveRequestBodyMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        executionCorrelationId: 'test-correlation-id-payload',
        runId: 'test-run-id',
        workerHandlerId: 'test-handler-id',
        progressUpdateType: 'WEBHOOK_RESPONSE',
        runDetails: expect.objectContaining({
          steps: {},
          status: 'RUNNING',
          duration: 1000,
          tasks: 1,
        }),
      }));
=======
      await progressService.sendUpdate(uniqueParams);
>>>>>>> main

      expect(saveRequestBodyMock).toHaveBeenCalledWith('test-run-id', expect.objectContaining({
        executionCorrelationId: 'test-correlation-id-payload',
        runId: 'test-run-id',
        workerHandlerId: 'test-handler-id',
        progressUpdateType: 'WEBHOOK_RESPONSE',
        runDetails: expect.objectContaining({
          steps: {},
          status: 'RUNNING',
          duration: 1000,
          tasks: 1,
        }),
      }));

      expect(mockMakeHttpRequest).toHaveBeenCalledTimes(1);
      const call = mockMakeHttpRequest.mock.calls[0];
      const [method, url, _, requestBody] = call;

      expect(method).toBe('POST');
      expect(url).toBe('http://localhost:3000/v1/engine/update-run');
      expect(requestBody).toEqual(
        expect.objectContaining({
          bodyAccessKey: 'request:test-run-id',
        })
      );
    });

    it('should handle null serverHandlerId', async () => {
      const paramsWithoutHandlerId = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-null-handler',
          serverHandlerId: null,
        },
      };

      saveRequestBodyMock.mockResolvedValue('request:test-run-id');
<<<<<<< HEAD
      progressService.sendUpdate(paramsWithoutHandlerId);
      await progressService.flushProgressUpdate(paramsWithoutHandlerId.engineConstants.flowRunId);

      expect(saveRequestBodyMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        executionCorrelationId: 'test-correlation-id-null-handler',
        runId: 'test-run-id',
        workerHandlerId: null,
        progressUpdateType: 'WEBHOOK_RESPONSE',
        runDetails: expect.objectContaining({
          steps: {},
          status: 'RUNNING',
          duration: 1000,
          tasks: 1,
        }),
      }));
=======
      await progressService.sendUpdate(paramsWithoutHandlerId);
>>>>>>> main

      expect(saveRequestBodyMock).toHaveBeenCalledWith('test-run-id', expect.objectContaining({
        executionCorrelationId: 'test-correlation-id-null-handler',
        runId: 'test-run-id',
        workerHandlerId: null,
        progressUpdateType: 'WEBHOOK_RESPONSE',
        runDetails: expect.objectContaining({
          steps: {},
          status: 'RUNNING',
          duration: 1000,
          tasks: 1,
        }),
      }));

      expect(mockMakeHttpRequest).toHaveBeenCalledTimes(1);
      const call = mockMakeHttpRequest.mock.calls[0];
      const [_, __, ___, requestBody] = call;

      expect(requestBody).toEqual({
          bodyAccessKey: 'request:test-run-id',
        }
      );
    });

    it('should only make the last request if they are very close.', async () => {
      const flowRunId = mockParams.engineConstants.flowRunId;
      const request1 = {
        ...mockParams,
        flowExecutorContext: {
          toResponse: jest.fn().mockResolvedValue({
            steps: {},
            status: 'RUNNING',
            duration: 500,
            tasks: 1,
          }),
        },
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-duplicate',
        },
      };
      const request2 = {
        ...mockParams,
        flowExecutorContext: {
          toResponse: jest.fn().mockResolvedValue({
            steps: {},
            status: 'SUCCESS',
            duration: 1000,
            tasks: 2,
          }),
        },
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-duplicate',
        },
      };

      progressService.sendUpdate(request1);
      progressService.sendUpdate(request2);

      await progressService.flushProgressUpdate(flowRunId);

      expect(mockMakeHttpRequest).toHaveBeenCalledTimes(1);

      expect(saveRequestBodyMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        executionCorrelationId: 'test-correlation-id-duplicate',
        runId: 'test-run-id',
        workerHandlerId: 'test-handler-id',
        progressUpdateType: 'WEBHOOK_RESPONSE',
        runDetails: expect.objectContaining({
          steps: {},
          status: 'SUCCESS',
          duration: 1000,
          tasks: 2,
        }),
      }));
    });

    it('should make multiple requests if they have different runIDs', async () => {
      const request1 = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          flowRunId: 'test-run-id-1',
          executionCorrelationId: 'test-correlation-id-duplicate',
        },
      };
      const request2 = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          flowRunId: 'test-run-id-2',
          executionCorrelationId: 'test-correlation-id-duplicate',
        },
      };

      progressService.sendUpdate(request1);
      progressService.sendUpdate(request2);

      await progressService.flushProgressUpdate('test-run-id-1');
      await progressService.flushProgressUpdate('test-run-id-2');

      expect(mockMakeHttpRequest).toHaveBeenCalledTimes(2);
    });

    it('should make multiple requests if they are spaced out in time.', async () => {
      const flowRunId = mockParams.engineConstants.flowRunId;
      const request = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-duplicate',
        },
      };

      progressService.sendUpdate(request);
      await new Promise(res => setTimeout(res, 801));
      progressService.sendUpdate(request);

      await progressService.flushProgressUpdate(flowRunId);

      expect(mockMakeHttpRequest).toHaveBeenCalledTimes(2);
    });

    it('should make multiple requests if they are spaced out in time even if the previous call did not end.', async () => {
      const flowRunId = mockParams.engineConstants.flowRunId;
      const request1 = {
        ...mockParams,
        flowExecutorContext: {
          toResponse: jest.fn().mockResolvedValue({
            steps: {},
            status: 'RUNNING',
            duration: 500,
            tasks: 1,
          }),
        },
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-duplicate',
        },
      };
      const request2 = {
        ...mockParams,
        flowExecutorContext: {
          toResponse: jest.fn().mockResolvedValue({
            steps: {},
            status: 'SUCCESS',
            duration: 1000,
            tasks: 2,
          }),
        },
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-duplicate',
        },
      };

      mockMakeHttpRequest.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 2000));
        return { data: 'ok' };
      });

      progressService.sendUpdate(request1);
      await new Promise(res => setTimeout(res, 801));
      progressService.sendUpdate(request2);
      await progressService.flushProgressUpdate(flowRunId);

      expect(mockMakeHttpRequest).toHaveBeenCalledTimes(2);

      expect(saveRequestBodyMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        executionCorrelationId: 'test-correlation-id-duplicate',
        runId: 'test-run-id',
        workerHandlerId: 'test-handler-id',
        progressUpdateType: 'WEBHOOK_RESPONSE',
        runDetails: expect.objectContaining({
          steps: {},
          status: 'RUNNING',
          duration: 500,
          tasks: 1,
        }),
      }));

      expect(saveRequestBodyMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        executionCorrelationId: 'test-correlation-id-duplicate',
        runId: 'test-run-id',
        workerHandlerId: 'test-handler-id',
        progressUpdateType: 'WEBHOOK_RESPONSE',
        runDetails: expect.objectContaining({
          steps: {},
          status: 'SUCCESS',
          duration: 1000,
          tasks: 2,
        }),
      }));
    });

    it('should construct correct URL', async () => {
      const paramsWithDifferentUrl = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-url',
          internalApiUrl: 'https://api.example.com/',
        },
      };

      progressService.sendUpdate(paramsWithDifferentUrl);
      await progressService.flushProgressUpdate(paramsWithDifferentUrl.engineConstants.flowRunId);

      expect(mockMakeHttpRequest).toHaveBeenCalledWith(
        'POST',
        'https://api.example.com/v1/engine/update-run',
        expect.any(Object),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should throw error when execution time is exceeded', async () => {
      const timeoutParams = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-timeout',
        },
      };

      const timeoutError = new Error('Execution time exceeded');
      mockThrowIfExecutionTimeExceeded.mockImplementation(() => {
        throw timeoutError;
      });

      expect(() => progressService.sendUpdate(timeoutParams))
        .toThrow('Execution time exceeded');
      expect(mockThrowIfExecutionTimeExceeded).toHaveBeenCalledTimes(1);
      expect(mockMakeHttpRequest).not.toHaveBeenCalled();
      expect(timeoutParams.flowExecutorContext.toResponse).not.toHaveBeenCalled();
    });

    it('should use correct retry configuration', async () => {
      const retryParams = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-retry',
        },
      };

      progressService.sendUpdate(retryParams);
      await progressService.flushProgressUpdate(retryParams.engineConstants.flowRunId);

      expect(mockMakeHttpRequest).toHaveBeenCalledWith(
        'POST',
        'http://localhost:3000/v1/engine/update-run',
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          retries: 3,
          retryDelay: expect.any(Function),
        })
      );

      // Test the retry delay function
      const call = mockMakeHttpRequest.mock.calls[0];
      const [_, __, ___, ____, options] = call;

      expect(options.retryDelay(0)).toBe(200); // 1st retry: 200ms
      expect(options.retryDelay(1)).toBe(400); // 2nd retry: 400ms
      expect(options.retryDelay(2)).toBe(600); // 3rd retry: 600ms
    });
  });
});
