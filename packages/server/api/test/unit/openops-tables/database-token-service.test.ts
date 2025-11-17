const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  authenticateDefaultUserInOpenOpsTables: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

const createDatabaseTokenMock = jest.fn();
jest.mock('../../../src/app/openops-tables/create-database-token', () => {
  return { createDatabaseToken: createDatabaseTokenMock };
});

import { DatabaseToken } from '../../../src/app/openops-tables/create-database-token';
import { databaseTokenService } from '../../../src/app/openops-tables/database-token-service';

describe('databaseTokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDatabaseToken', () => {
    it('should generate a database token with correct name prefix and parameters', async () => {
      const projectId = 'test-project-123';
      const workspaceId = 42;
      const systemToken = 'test-system-token';
      const mockToken: DatabaseToken = {
        id: 1,
        name: 'Project_test-project-123',
        workspace: workspaceId,
        key: 'test-database-token-key',
        permissions: {
          create: true,
          read: true,
          update: true,
          delete: true,
        },
      };

      openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue(
        {
          token: systemToken,
        },
      );
      createDatabaseTokenMock.mockResolvedValue(mockToken);

      const result = await databaseTokenService.generateDatabaseToken(
        projectId,
        workspaceId,
      );

      expect(result).toEqual(mockToken);
      expect(
        openopsCommonMock.authenticateDefaultUserInOpenOpsTables,
      ).toHaveBeenCalledTimes(1);
      expect(createDatabaseTokenMock).toHaveBeenCalledTimes(1);
      expect(createDatabaseTokenMock).toHaveBeenCalledWith({
        name: 'Project_test-project-123',
        workspaceId,
        systemToken,
      });
    });

    it('should handle different project IDs correctly', async () => {
      const projectId = 'another-project';
      const workspaceId = 100;
      const systemToken = 'another-token';
      const mockToken: DatabaseToken = {
        id: 2,
        name: 'Project_another-project',
        workspace: workspaceId,
        key: 'another-key',
        permissions: {
          create: true,
          read: true,
          update: false,
          delete: false,
        },
      };

      openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue(
        {
          token: systemToken,
        },
      );
      createDatabaseTokenMock.mockResolvedValue(mockToken);

      const result = await databaseTokenService.generateDatabaseToken(
        projectId,
        workspaceId,
      );

      expect(result).toEqual(mockToken);
      expect(createDatabaseTokenMock).toHaveBeenCalledWith({
        name: 'Project_another-project',
        workspaceId,
        systemToken,
      });
    });

    it.each([
      {
        description: 'from authenticateDefaultUserInOpenOpsTables',
        setupMocks: (): void => {
          openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockRejectedValue(
            new Error('Authentication failed'),
          );
        },
        errorMessage: 'Authentication failed',
        expectedAuthCalls: 1,
        expectedCreateTokenCalls: 0,
      },
      {
        description: 'from createDatabaseToken',
        setupMocks: (): void => {
          openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue(
            {
              token: 'test-token',
            },
          );
          createDatabaseTokenMock.mockRejectedValue(
            new Error('Token creation failed'),
          );
        },
        errorMessage: 'Token creation failed',
        expectedAuthCalls: 1,
        expectedCreateTokenCalls: 1,
      },
    ])(
      'should propagate errors $description',
      async ({
        setupMocks,
        errorMessage,
        expectedAuthCalls,
        expectedCreateTokenCalls,
      }) => {
        const projectId = 'test-project';
        const workspaceId = 1;

        setupMocks();

        await expect(
          databaseTokenService.generateDatabaseToken(projectId, workspaceId),
        ).rejects.toThrow(errorMessage);

        expect(
          openopsCommonMock.authenticateDefaultUserInOpenOpsTables,
        ).toHaveBeenCalledTimes(expectedAuthCalls);
        expect(createDatabaseTokenMock).toHaveBeenCalledTimes(
          expectedCreateTokenCalls,
        );
      },
    );
  });
});
