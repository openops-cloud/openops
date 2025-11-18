export const mockedRepo = {
  findOneBy: jest.fn(),
  createQueryBuilder: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

jest.mock('../../../src/app/core/db/repo-factory', () => {
  return {
    repoFactory: () => jest.fn().mockReturnValue(mockedRepo),
  };
});

const fileServiceMock = {
  save: jest.fn(),
};
jest.mock('../../../src/app/file/file.service', () => {
  return {
    fileService: fileServiceMock,
  };
});

const flowVersionServiceMock = {
  getOneOrThrow: jest.fn(),
};
jest.mock('../../../src/app/flows/flow-version/flow-version.service', () => {
  return {
    flowVersionService: flowVersionServiceMock,
  };
});

const logSerializerMock = {
  serialize: jest.fn(),
};
jest.mock('../../../src/app/flows/flow-run/log-serializer', () => {
  return {
    logSerializer: logSerializerMock,
  };
});

import {
  FileCompression,
  FileType,
  FlowRunStatus,
  FlowRunTriggerSource,
  RunEnvironment,
  StepOutputStatus,
} from '@openops/shared';
import { flowRunService } from '../../../src/app/flows/flow-run/flow-run-service';

describe('flowRunService.recordTriggerFailure', () => {
  const now = new Date('2024-01-02T03:04:05.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(now);
    jest.clearAllMocks();
    logSerializerMock.serialize.mockResolvedValue(
      Buffer.from('compressed-logs'),
    );
    fileServiceMock.save.mockResolvedValue({ id: 'file_123' });
    flowVersionServiceMock.getOneOrThrow.mockResolvedValue({
      id: 'fv_1',
      flowId: 'flow_1',
      displayName: 'My Flow V1',
      trigger: {
        name: 'triggerStep',
        type: 'POLLING',
      },
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should create a failed flow run with logs when triggerInput is provided', async () => {
    await flowRunService.recordTriggerFailure({
      projectId: 'proj_1',
      flowVersionId: 'fv_1',
      errorMessage: 'Trigger failed to execute',
      reason: 'TRIGGER_ERROR',
      triggerInput: { a: 1 },
    });

    expect(logSerializerMock.serialize).toHaveBeenCalledTimes(1);
    const serializeArg = (logSerializerMock.serialize as jest.Mock).mock
      .calls[0][0];
    expect(serializeArg).toEqual({
      executionState: {
        steps: {
          triggerStep: {
            type: 'POLLING',
            status: StepOutputStatus.FAILED,
            input: { a: 1 },
            errorMessage: 'Trigger failed to execute',
          },
        },
      },
    });

    expect(fileServiceMock.save).toHaveBeenCalledTimes(1);
    const saveArg = (fileServiceMock.save as jest.Mock).mock.calls[0][0];
    expect(saveArg).toEqual(
      expect.objectContaining({
        fileId: expect.any(String),
        data: Buffer.from('compressed-logs'),
        type: FileType.FLOW_RUN_LOG,
        compression: FileCompression.GZIP,
        projectId: 'proj_1',
      }),
    );

    expect(mockedRepo.save).toHaveBeenCalledTimes(1);
    const saved = mockedRepo.save.mock.calls[0][0];
    expect(saved).toMatchObject({
      projectId: 'proj_1',
      flowId: 'flow_1',
      flowVersionId: 'fv_1',
      environment: RunEnvironment.PRODUCTION,
      flowDisplayName: 'My Flow V1',
      startTime: now.toISOString(),
      finishTime: now.toISOString(),
      status: FlowRunStatus.FAILED,
      triggerSource: FlowRunTriggerSource.TRIGGERED,
      terminationReason: 'TRIGGER_ERROR',
      tasks: 0,
      duration: 0,
      tags: [],
    });
    expect(saved.logsFileId).toBe(saveArg.fileId);

    expect(typeof saved.id).toBe('string');
    expect(saved.id.length).toBeGreaterThan(0);
  });

  it('should create a failed flow run without triggerInput when not provided', async () => {
    await flowRunService.recordTriggerFailure({
      projectId: 'proj_2',
      flowVersionId: 'fv_1',
      errorMessage: 'Boom',
      reason: 'TRIGGER_ERROR_NO_INPUT',
    });

    const serializeArg = (logSerializerMock.serialize as jest.Mock).mock
      .calls[0][0];
    expect(serializeArg.executionState.steps.triggerStep).toEqual({
      type: 'POLLING',
      status: StepOutputStatus.FAILED,
      input: undefined,
      errorMessage: 'Boom',
    });

    const saved = mockedRepo.save.mock.calls[0][0];
    expect(saved.projectId).toBe('proj_2');
    expect(saved.terminationReason).toBe('TRIGGER_ERROR_NO_INPUT');
  });
});
