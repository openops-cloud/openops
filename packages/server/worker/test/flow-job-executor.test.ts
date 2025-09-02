/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  distributedLock,
  exceptionHandler,
  JobStatus,
  OneTimeJobData,
  QueueName,
} from '@openops/server-shared';
import {
  ApplicationError,
  EngineResponseStatus,
  ErrorCode,
  ExecutionType,
  FlowRunStatus,
  ProgressUpdateType,
} from '@openops/shared';

jest.mock('../src/lib/engine', () => ({
  engineRunner: {
    executeFlow: jest.fn(),
  },
}));

jest.mock('../src/lib/api/server-api.service', () => ({
  engineApiService: jest.fn().mockImplementation(() => ({
    getRun: jest.fn(),
    getFlowWithExactBlocks: jest.fn(),
    updateRunStatus: jest.fn(),
    updateJobStatus: jest.fn(),
  })),
}));

jest.mock('@openops/server-shared', () => {
  const original = jest.requireActual('@openops/server-shared');
  return {
    ...original,
    distributedLock: {
      acquireLock: jest.fn().mockResolvedValue({
        release: jest.fn().mockResolvedValue(undefined),
      }),
    },
    exceptionHandler: {
      handle: jest.fn(),
    },
    logger: {
      info: jest.fn(),
    },
    flowTimeoutSandbox: 5,
  };
});

import { engineApiService } from '../src/lib/api/server-api.service';
import { engineRunner } from '../src/lib/engine';
import { flowJobExecutor } from '../src/lib/executors/flow-job-executor';

const asMock = <T extends (...args: any) => unknown>(fn: T) =>
  fn as unknown as jest.MockedFunction<T>;

function buildJob(overrides: Partial<OneTimeJobData> = {}): OneTimeJobData {
  return {
    runId: 'run-1',
    flowVersionId: 'fv-1',
    projectId: 'proj-1',
    payload: { foo: 'bar' } as any,
    environment: 'TESTING',
    executionType: ExecutionType.BEGIN,
    synchronousHandlerId: 'wh-1',
    executionCorrelationId: 'corr-1',
    progressUpdateType: ProgressUpdateType.NONE,
    ...overrides,
  } as unknown as OneTimeJobData;
}

describe('Execute workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should execute the workflow normally', async () => {
    const job = buildJob({ executionType: ExecutionType.BEGIN });

    const api = engineApiService('token') as any;
    asMock(engineApiService).mockReturnValue(api);

    api.getFlowWithExactBlocks.mockResolvedValue({
      version: { id: 'fv-1' },
    });

    asMock(engineRunner.executeFlow).mockResolvedValue({
      status: EngineResponseStatus.OK,
      result: { status: FlowRunStatus.SUCCEEDED },
    });

    api.updateRunStatus.mockResolvedValue(undefined);
    api.updateJobStatus.mockResolvedValue(undefined);

    await flowJobExecutor.executeFlow(job as OneTimeJobData, 'token');

    expect(distributedLock.acquireLock).toHaveBeenCalledWith({
      key: job.runId,
      timeout: expect.any(Number),
    });

    expect(api.updateRunStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: job.runId,
        runDetails: expect.objectContaining({ status: FlowRunStatus.RUNNING }),
      }),
    );

    expect(engineRunner.executeFlow).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({ executionType: ExecutionType.BEGIN }),
    );

    expect(api.updateJobStatus).toHaveBeenCalledWith({
      status: JobStatus.COMPLETED,
      message: 'Flow succeeded',
      queueName: QueueName.ONE_TIME,
    });

    const lock = await (distributedLock.acquireLock as any).mock.results[0]
      .value;
    expect(lock.release).toHaveBeenCalled();
  });

  test('should resume the workflow normally', async () => {
    const job = buildJob({ executionType: ExecutionType.RESUME });
    const api = engineApiService('token') as any;
    asMock(engineApiService).mockReturnValue(api);

    api.getRun.mockResolvedValue({ status: FlowRunStatus.SUCCEEDED });
    api.getFlowWithExactBlocks.mockResolvedValue({ version: { id: 'fv-1' } });
    api.updateJobStatus.mockResolvedValue(undefined);

    await flowJobExecutor.executeFlow(job as OneTimeJobData, 'token');

    expect(engineRunner.executeFlow).not.toHaveBeenCalled();
    expect(api.updateJobStatus).toHaveBeenCalledWith({
      status: JobStatus.COMPLETED,
      message: 'Flow succeeded',
      queueName: QueueName.ONE_TIME,
    });
  });

  test('should update the workflow status to TIMEOUT and the job to completed', async () => {
    const job = buildJob();
    const api = engineApiService('t') as any;
    asMock(engineApiService).mockReturnValue(api);

    api.getFlowWithExactBlocks.mockResolvedValue({ version: { id: 'fv-1' } });

    asMock(engineRunner.executeFlow).mockResolvedValue({
      status: EngineResponseStatus.TIMEOUT,
      result: { status: FlowRunStatus.RUNNING },
    });

    await flowJobExecutor.executeFlow(job as OneTimeJobData, 't');

    expect(api.updateRunStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        runDetails: expect.objectContaining({ status: FlowRunStatus.TIMEOUT }),
      }),
    );
    expect(api.updateJobStatus).toHaveBeenCalledWith({
      status: JobStatus.COMPLETED,
      message: 'Flow succeeded',
      queueName: QueueName.ONE_TIME,
    });
  });

  test('should update the workflow status to ABORTED and the job to completed', async () => {
    const job = buildJob();
    const api = engineApiService('t') as any;
    asMock(engineApiService).mockReturnValue(api);

    api.getFlowWithExactBlocks.mockResolvedValue({ version: { id: 'fv-1' } });

    asMock(engineRunner.executeFlow).mockResolvedValue({
      status: EngineResponseStatus.ERROR,
      result: { status: FlowRunStatus.ABORTED },
    });

    await flowJobExecutor.executeFlow(job as OneTimeJobData, 't');

    expect(api.updateRunStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        runDetails: expect.objectContaining({ status: FlowRunStatus.ABORTED }),
      }),
    );
    expect(api.updateJobStatus).toHaveBeenCalledWith({
      status: JobStatus.COMPLETED,
      message: 'Flow succeeded',
      queueName: QueueName.ONE_TIME,
    });
  });

  test('should update the workflow status to INTERNAL_ERROR and the job to failed', async () => {
    const job = buildJob();
    const api = engineApiService('t') as any;
    asMock(engineApiService).mockReturnValue(api);

    api.getFlowWithExactBlocks.mockResolvedValue({ version: { id: 'fv-1' } });

    asMock(engineRunner.executeFlow).mockResolvedValue({
      status: EngineResponseStatus.OK,
      result: {
        status: FlowRunStatus.INTERNAL_ERROR,
        error: { message: 'boom', stepName: 'step-1' },
      },
    });

    await flowJobExecutor.executeFlow(job as OneTimeJobData, 't');

    expect(api.updateRunStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        runDetails: expect.objectContaining({
          status: FlowRunStatus.INTERNAL_ERROR,
        }),
      }),
    );

    expect(exceptionHandler.handle).toHaveBeenCalled();

    expect(api.updateJobStatus).toHaveBeenCalledWith({
      status: JobStatus.FAILED,
      message: expect.stringContaining(
        'Internal error reported by engine. Error message: boom',
      ),
      queueName: QueueName.ONE_TIME,
    });
  });

  test('Thrown ApplicationError with EXECUTION_TIMEOUT: updates run TIMEOUT and completes job', async () => {
    const job = buildJob();
    const api = engineApiService('t') as any;
    asMock(engineApiService).mockReturnValue(api);

    api.getFlowWithExactBlocks.mockResolvedValue({ version: { id: 'fv-1' } });

    asMock(engineRunner.executeFlow).mockRejectedValue(
      new ApplicationError({
        code: ErrorCode.EXECUTION_TIMEOUT,
        params: {},
      }),
    );

    await flowJobExecutor.executeFlow(job as OneTimeJobData, 't');

    expect(api.updateRunStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        runDetails: expect.objectContaining({ status: FlowRunStatus.TIMEOUT }),
      }),
    );

    expect(api.updateJobStatus).toHaveBeenCalledWith({
      status: JobStatus.COMPLETED,
      message: 'Flow succeeded',
      queueName: QueueName.ONE_TIME,
    });
  });

  test('Nil flow: returns without executing but still completes job', async () => {
    const job = buildJob();
    const api = engineApiService('t') as any;
    asMock(engineApiService).mockReturnValue(api);

    api.getFlowWithExactBlocks.mockResolvedValue(null);

    await flowJobExecutor.executeFlow(job as OneTimeJobData, 't');

    expect(engineRunner.executeFlow).not.toHaveBeenCalled();
    expect(api.updateJobStatus).toHaveBeenCalledWith({
      status: JobStatus.COMPLETED,
      message: 'Flow succeeded',
      queueName: QueueName.ONE_TIME,
    });
  });
});
