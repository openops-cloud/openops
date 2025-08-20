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
      await progressService.sendUpdate(successParams);

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
      await progressService.sendUpdate(uniqueParams);

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
      await progressService.sendUpdate(paramsWithoutHandlerId);

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

    it('should deduplicate identical requests based on hash', async () => {
      const duplicateParams = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-duplicate',
        },
      };

      await progressService.sendUpdate(duplicateParams);
      await progressService.sendUpdate(duplicateParams);

      expect(mockMakeHttpRequest).toHaveBeenCalledTimes(1);
    });

    it('should send different requests when content changes', async () => {
      const params1 = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-different-1',
        },
      };
      const params2 = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-different-2',
          flowRunId: 'different-run-id',
        },
      };

      await progressService.sendUpdate(params1);
      await progressService.sendUpdate(params2);

      expect(mockMakeHttpRequest).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate requests with different durations but same content', async () => {
      const baseParams = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-duration',
        },
      };

      const params1 = {
        ...baseParams,
        flowExecutorContext: {
          toResponse: jest.fn().mockResolvedValue({
            steps: {},
            status: 'RUNNING',
            duration: 1000,
            tasks: 1,
          }),
        },
      };

      const params2 = {
        ...baseParams,
        flowExecutorContext: {
          toResponse: jest.fn().mockResolvedValue({
            steps: {},
            status: 'RUNNING',
            duration: 2500, // different duration
            tasks: 1,
          }),
        },
      };

      await progressService.sendUpdate(params1);
      await progressService.sendUpdate(params2);

      expect(mockMakeHttpRequest).toHaveBeenCalledTimes(1);
      expect(params1.flowExecutorContext.toResponse).toHaveBeenCalledTimes(1);
      expect(params2.flowExecutorContext.toResponse).toHaveBeenCalledTimes(1);
    });

    it('should send separate requests when non-duration fields change', async () => {
      const baseParams = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-non-duration',
        },
      };

      const params1 = {
        ...baseParams,
        flowExecutorContext: {
          toResponse: jest.fn().mockResolvedValue({
            steps: {},
            status: 'RUNNING',
            duration: 1000,
            tasks: 1,
          }),
        },
      };

      const params2 = {
        ...baseParams,
        flowExecutorContext: {
          toResponse: jest.fn().mockResolvedValue({
            steps: {},
            status: 'COMPLETED',
            duration: 1000,
            tasks: 1,
          }),
        },
      };

      await progressService.sendUpdate(params1);
      await progressService.sendUpdate(params2);

      expect(mockMakeHttpRequest).toHaveBeenCalledTimes(2);
      expect(params1.flowExecutorContext.toResponse).toHaveBeenCalledTimes(1);
      expect(params2.flowExecutorContext.toResponse).toHaveBeenCalledTimes(1);
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

      await progressService.sendUpdate(paramsWithDifferentUrl);

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

      await expect(progressService.sendUpdate(timeoutParams)).rejects.toThrow('Execution time exceeded');
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

      await progressService.sendUpdate(retryParams);

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
