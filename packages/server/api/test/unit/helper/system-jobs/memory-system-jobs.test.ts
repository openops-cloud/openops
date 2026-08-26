import dayjs from 'dayjs';
import cron from 'node-cron';
import { SystemJobName } from '../../../../src/app/helper/system-jobs/common';
import { systemJobHandlers } from '../../../../src/app/helper/system-jobs/job-handlers';
import { memorySystemJobSchedulerService } from '../../../../src/app/helper/system-jobs/memory-system-jobs';

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

const scheduleMock = cron.schedule as jest.Mock;

const buildCronTask = (): { stop: jest.Mock } => ({ stop: jest.fn() });

describe('memorySystemJobSchedulerService', () => {
  let handler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    handler = jest.fn().mockResolvedValue(undefined);
    jest
      .spyOn(systemJobHandlers, 'getJobHandler')
      .mockReturnValue(handler as never);
    scheduleMock.mockReturnValue(buildCronTask());
  });

  afterEach(async () => {
    await memorySystemJobSchedulerService.close();
    jest.useRealTimers();
  });

  it('stops repeated cron tasks on close so no timer outlives the app', async () => {
    const task = buildCronTask();
    scheduleMock.mockReturnValue(task);

    await memorySystemJobSchedulerService.upsertJob({
      job: { name: SystemJobName.OAUTH_CLEANUP, data: {} },
      schedule: { type: 'repeated', cron: '0 * * * *' },
    });

    expect(scheduleMock).toHaveBeenCalledTimes(1);
    expect(task.stop).not.toHaveBeenCalled();

    await memorySystemJobSchedulerService.close();

    expect(task.stop).toHaveBeenCalledTimes(1);
  });

  it('clears pending one-time timers on close so the handler never fires', async () => {
    await memorySystemJobSchedulerService.upsertJob({
      job: {
        name: SystemJobName.CAMPAIGN_COMPLETION,
        jobId: 'campaign-completion-1',
        data: { campaignId: 'c1', projectId: 'p1' },
      },
      schedule: { type: 'one-time', date: dayjs().add(5, 'minutes') },
    });

    await memorySystemJobSchedulerService.close();
    jest.advanceTimersByTime(600_000);

    expect(handler).not.toHaveBeenCalled();
  });

  it('runs a pending one-time job that has not been cleared', async () => {
    await memorySystemJobSchedulerService.upsertJob({
      job: {
        name: SystemJobName.CAMPAIGN_COMPLETION,
        jobId: 'campaign-completion-2',
        data: { campaignId: 'c2', projectId: 'p2' },
      },
      schedule: { type: 'one-time', date: dayjs().add(5, 'minutes') },
    });

    jest.advanceTimersByTime(600_000);

    expect(handler).toHaveBeenCalledWith({
      campaignId: 'c2',
      projectId: 'p2',
    });
  });

  it('stops the cron task of a removed job instead of leaving it running', async () => {
    const task = buildCronTask();
    scheduleMock.mockReturnValue(task);

    await memorySystemJobSchedulerService.upsertJob({
      job: {
        name: SystemJobName.CONNECTION_VALIDATION,
        jobId: 'connection-validation',
        data: undefined,
      },
      schedule: { type: 'repeated', cron: '*/5 * * * *' },
    });

    await memorySystemJobSchedulerService.removeJob('connection-validation');

    expect(task.stop).toHaveBeenCalledTimes(1);
  });

  it('schedules a job once, then again only after it is removed', async () => {
    const job = {
      job: {
        name: SystemJobName.CONNECTION_VALIDATION,
        jobId: 'connection-validation-2',
        data: undefined,
      },
      schedule: { type: 'repeated' as const, cron: '*/5 * * * *' },
    };

    await memorySystemJobSchedulerService.upsertJob(job);
    await memorySystemJobSchedulerService.upsertJob(job);
    expect(scheduleMock).toHaveBeenCalledTimes(1);

    await memorySystemJobSchedulerService.removeJob('connection-validation-2');
    await memorySystemJobSchedulerService.upsertJob(job);

    expect(scheduleMock).toHaveBeenCalledTimes(2);
  });
});
