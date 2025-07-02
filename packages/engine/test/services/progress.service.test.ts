import { progressService } from '../../src/lib/services/progress.service';
import { logger } from '@openops/server-shared';
import { throwIfExecutionTimeExceeded } from '../../src/lib/timeout-validator';

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../src/lib/timeout-validator', () => ({
  throwIfExecutionTimeExceeded: jest.fn(),
}));

const mockThrowIfExecutionTimeExceeded = throwIfExecutionTimeExceeded as jest.MockedFunction<typeof throwIfExecutionTimeExceeded>;

global.fetch = jest.fn();

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
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
    });
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

      await progressService.sendUpdate(successParams);

      expect(logger.debug).toHaveBeenCalledWith('Sending run update run request');
      expect(successParams.flowExecutorContext.toResponse).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/v1/engine/update-run',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        })
      );
    });

    it('should throw error when executionCorrelationId is missing', async () => {
      const paramsWithoutCorrelationId = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: undefined,
        },
      };

      await expect(progressService.sendUpdate(paramsWithoutCorrelationId)).rejects.toThrow(
        'The executionCorrelationId is not defined when sending an update run progress request.'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'The executionCorrelationId is not defined when sending an update run progress request.'
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

      await progressService.sendUpdate(uniqueParams);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const [url, options] = fetchCall;
      const requestBody = JSON.parse(options.body);

      expect(requestBody).toEqual(
        expect.objectContaining({
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

      await progressService.sendUpdate(paramsWithoutHandlerId);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const [url, options] = fetchCall;
      const requestBody = JSON.parse(options.body);
      
      expect(requestBody.workerHandlerId).toBe(null);
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

      expect(global.fetch).toHaveBeenCalledTimes(1);
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

      expect(global.fetch).toHaveBeenCalledTimes(2);
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

      expect(global.fetch).toHaveBeenCalledTimes(1);
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

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(params1.flowExecutorContext.toResponse).toHaveBeenCalledTimes(1);
      expect(params2.flowExecutorContext.toResponse).toHaveBeenCalledTimes(1);
    });

    it('should use mutex for thread safety', async () => {
      const concurrentParams = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-concurrent',
        },
      };

      // Make multiple concurrent requests
      const promises = [
        progressService.sendUpdate(concurrentParams),
        progressService.sendUpdate(concurrentParams),
        progressService.sendUpdate(concurrentParams),
      ];

      await Promise.all(promises);

      // Due to mutex locking and request deduplication, should only make one request
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors gracefully', async () => {
      const errorParams = {
        ...mockParams,
        engineConstants: {
          ...mockParams.engineConstants,
          executionCorrelationId: 'test-correlation-id-error',
        },
      };

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(progressService.sendUpdate(errorParams)).rejects.toThrow('Network error');
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

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/engine/update-run',
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
      expect(global.fetch).not.toHaveBeenCalled();
      expect(timeoutParams.flowExecutorContext.toResponse).not.toHaveBeenCalled();
    });
  });
}); 