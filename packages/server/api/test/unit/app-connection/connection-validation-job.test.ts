const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockSystemGet = jest.fn();

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  logger: mockLogger,
  system: {
    get: mockSystemGet,
  },
  AppSystemProp: {
    CONNECTION_VALIDATION_CRON: 'CONNECTION_VALIDATION_CRON',
  },
}));

const mockFind = jest.fn();

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  repoFactory: () => () => ({
    find: mockFind,
  }),
}));

const mockRegisterJobHandler = jest.fn();
jest.mock('../../../src/app/helper/system-jobs/job-handlers', () => ({
  systemJobHandlers: {
    registerJobHandler: mockRegisterJobHandler,
  },
}));

const mockUpsertJob = jest.fn();
jest.mock('../../../src/app/helper/system-jobs', () => ({
  systemJobsSchedule: {
    upsertJob: mockUpsertJob,
  },
}));

const mockValidateConnections = jest.fn();
jest.mock(
  '../../../src/app/app-connection/app-connection-service/app-connection-service',
  () => ({
    appConnectionService: {
      validateConnections: mockValidateConnections,
    },
  }),
);

import { AppConnectionStatus } from '@openops/shared';
import { SystemJobName } from '../../../src/app/helper/system-jobs/common';

function loadModule(): {
  registerConnectionValidationJob: () => Promise<void>;
} {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../../src/app/app-connection/connection-validation-job') as {
    registerConnectionValidationJob: () => Promise<void>;
  };
}

describe('registerConnectionValidationJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('registration', () => {
    it('should register the job handler', async () => {
      mockSystemGet.mockReturnValue(undefined);
      const { registerConnectionValidationJob } = loadModule();

      await registerConnectionValidationJob();

      expect(mockRegisterJobHandler).toHaveBeenCalledWith(
        SystemJobName.CONNECTION_VALIDATION,
        expect.any(Function),
      );
    });

    it('should schedule the job when cron is configured', async () => {
      mockSystemGet.mockReturnValue('0 */6 * * *');
      const { registerConnectionValidationJob } = loadModule();

      await registerConnectionValidationJob();

      expect(mockUpsertJob).toHaveBeenCalledWith({
        job: {
          name: SystemJobName.CONNECTION_VALIDATION,
          data: undefined,
        },
        schedule: {
          type: 'repeated',
          cron: '0 */6 * * *',
        },
      });
    });

    it('should not schedule the job when cron is not configured', async () => {
      mockSystemGet.mockReturnValue(undefined);
      const { registerConnectionValidationJob } = loadModule();

      await registerConnectionValidationJob();

      expect(mockUpsertJob).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('disabled'),
      );
    });
  });

  describe('job handler execution', () => {
    let jobHandler: () => Promise<void>;

    beforeEach(async (): Promise<void> => {
      mockSystemGet.mockReturnValue('0 */6 * * *');
      const { registerConnectionValidationJob } = loadModule();
      await registerConnectionValidationJob();
      jobHandler = mockRegisterJobHandler.mock.calls[0][1];
    });

    it('should validate all active connections', async () => {
      const connections = [
        {
          id: 'conn-1',
          name: 'connection-1',
          projectId: 'project-1',
          status: AppConnectionStatus.ACTIVE,
        },
        {
          id: 'conn-2',
          name: 'connection-2',
          projectId: 'project-2',
          status: AppConnectionStatus.ACTIVE,
        },
      ];

      const projects = [
        { id: 'project-1', displayName: 'Project 1' },
        { id: 'project-2', displayName: 'Project 2' },
      ];

      mockFind
        .mockResolvedValueOnce(connections)
        .mockResolvedValueOnce(projects);
      mockValidateConnections.mockResolvedValue(undefined);

      await jobHandler();

      expect(mockValidateConnections).toHaveBeenCalledTimes(2);
      expect(mockValidateConnections).toHaveBeenCalledWith(connections[0]);
      expect(mockValidateConnections).toHaveBeenCalledWith(connections[1]);
    });

    it('should continue validating other connections when one fails', async () => {
      const connections = [
        {
          id: 'conn-1',
          name: 'connection-1',
          projectId: 'project-1',
          status: AppConnectionStatus.ACTIVE,
        },
        {
          id: 'conn-2',
          name: 'connection-2',
          projectId: 'project-1',
          status: AppConnectionStatus.ACTIVE,
        },
      ];

      const projects = [{ id: 'project-1', displayName: 'Project 1' }];

      mockFind
        .mockResolvedValueOnce(connections)
        .mockResolvedValueOnce(projects);
      mockValidateConnections
        .mockRejectedValueOnce(new Error('validation failed'))
        .mockResolvedValueOnce(undefined);

      await jobHandler();

      expect(mockValidateConnections).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to validate connection',
        expect.objectContaining({
          connectionId: 'conn-1',
          connectionName: 'connection-1',
          projectId: 'project-1',
          projectName: 'Project 1',
        }),
      );
    });

    it('should handle missing project gracefully', async () => {
      const connections = [
        {
          id: 'conn-1',
          name: 'connection-1',
          projectId: 'project-unknown',
          status: AppConnectionStatus.ACTIVE,
        },
      ];

      mockFind.mockResolvedValueOnce(connections).mockResolvedValueOnce([]);
      mockValidateConnections.mockRejectedValueOnce(new Error('fail'));

      await jobHandler();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to validate connection',
        expect.objectContaining({
          projectName: undefined,
          projectId: 'project-unknown',
        }),
      );
    });

    it('should deduplicate project IDs when fetching projects', async () => {
      const connections = [
        {
          id: 'conn-1',
          name: 'connection-1',
          projectId: 'project-1',
          status: AppConnectionStatus.ACTIVE,
        },
        {
          id: 'conn-2',
          name: 'connection-2',
          projectId: 'project-1',
          status: AppConnectionStatus.ACTIVE,
        },
      ];

      const projects = [{ id: 'project-1', displayName: 'Project 1' }];

      mockFind
        .mockResolvedValueOnce(connections)
        .mockResolvedValueOnce(projects);
      mockValidateConnections.mockResolvedValue(undefined);

      await jobHandler();

      const projectQuery = mockFind.mock.calls[1][0];
      const projectIds = projectQuery.where.id._value;
      expect(projectIds).toEqual(['project-1']);
    });

    it('should handle no active connections', async () => {
      mockFind.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await jobHandler();

      expect(mockValidateConnections).not.toHaveBeenCalled();
    });

    it('should log error and not throw when the job fails', async () => {
      mockFind.mockRejectedValueOnce(new Error('db error'));

      await jobHandler();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Connection validation job failed',
        expect.any(Error),
      );
    });
  });
});
