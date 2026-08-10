const registerJobHandler = jest.fn();
const upsertJob = jest.fn();
const repoDelete = jest.fn(async () => ({ affected: 0 }));

jest.mock('../../../src/app/helper/system-jobs/job-handlers', () => ({
  systemJobHandlers: { registerJobHandler },
}));

jest.mock('../../../src/app/helper/system-jobs', () => ({
  systemJobsSchedule: { upsertJob },
}));

// Any database access at all is the signal these tests watch for.
jest.mock('../../../src/app/core/db/repo-factory', () => ({
  repoFactory: () => () => ({
    delete: repoDelete,
    createQueryBuilder: () => ({
      delete: () => ({
        where: () => ({
          andWhere: () => ({
            andWhere: () => ({ execute: async () => ({ affected: 0 }) }),
            execute: async () => ({ affected: 0 }),
          }),
        }),
      }),
    }),
  }),
}));

import { SystemJobName } from '../../../src/app/helper/system-jobs/common';
import { oauthConfig } from '../../../src/app/oauth/config/oauth-config';
import {
  registerOAuthCleanupHandler,
  scheduleOAuthCleanupJob,
} from '../../../src/app/oauth/oauth-cleanup-job';

// The schedule is stored in Redis, so it outlives the boot that created it. These cover
// the next boot, which may have OAuth switched off.
describe('OAuth cleanup registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the handler even when OAuth is disabled', () => {
    jest.spyOn(oauthConfig, 'isEnabled').mockReturnValue(false);

    registerOAuthCleanupHandler();

    // Without this the worker finds no handler for a job still on the schedule and fails
    // it hourly, for a feature nobody is using.
    expect(registerJobHandler).toHaveBeenCalledWith(
      SystemJobName.OAUTH_CLEANUP,
      expect.any(Function),
    );
  });

  it('touches nothing when the job fires while OAuth is disabled', async () => {
    jest.spyOn(oauthConfig, 'isEnabled').mockReturnValue(false);

    registerOAuthCleanupHandler();
    const handler = registerJobHandler.mock.calls[0][1];

    await expect(handler({})).resolves.toBeUndefined();
    expect(repoDelete).not.toHaveBeenCalled();
  });

  it('does the work when the job fires while OAuth is enabled', async () => {
    jest.spyOn(oauthConfig, 'isEnabled').mockReturnValue(true);

    registerOAuthCleanupHandler();
    const handler = registerJobHandler.mock.calls[0][1];

    await handler({});

    // Proves the guard above is the reason nothing happened, not a broken handler.
    expect(repoDelete).toHaveBeenCalled();
  });

  it('schedules the repeatable job separately from registering the handler', async () => {
    await scheduleOAuthCleanupJob();

    expect(upsertJob).toHaveBeenCalledWith(
      expect.objectContaining({
        job: expect.objectContaining({ name: SystemJobName.OAUTH_CLEANUP }),
        schedule: expect.objectContaining({ type: 'repeated' }),
      }),
    );
    // Scheduling happens only on an OAuth-enabled boot, so it cannot be what registers
    // the handler.
    expect(registerJobHandler).not.toHaveBeenCalled();
  });
});
