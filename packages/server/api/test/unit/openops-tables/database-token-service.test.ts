const createDatabaseTokenMock = jest.fn();
jest.mock('../../../src/app/openops-tables/index', () => {
  return {
    openopsTables: {
      createDatabaseToken: createDatabaseTokenMock,
    },
  };
});

import { DatabaseToken } from '../../../src/app/openops-tables/create-database-token';
import { generateDatabaseToken } from '../../../src/app/openops-tables/database-token-service';

describe('generateDatabaseToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a database token with correct name prefix and parameters', async () => {
    const systemToken = 'test-system-token';
    const projectId = 'test-project-123';
    const workspaceId = 42;
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

    createDatabaseTokenMock.mockResolvedValue(mockToken);

    const result = await generateDatabaseToken(
      systemToken,
      projectId,
      workspaceId,
    );

    expect(result).toEqual(mockToken);
    expect(createDatabaseTokenMock).toHaveBeenCalledTimes(1);
    expect(createDatabaseTokenMock).toHaveBeenCalledWith({
      name: 'Project_test-project-123',
      workspaceId,
      systemToken,
    });
  });

  it('should handle different project IDs correctly', async () => {
    const systemToken = 'another-token';
    const projectId = 'another-project';
    const workspaceId = 100;
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

    createDatabaseTokenMock.mockResolvedValue(mockToken);

    const result = await generateDatabaseToken(
      systemToken,
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

  it('should propagate errors from createDatabaseToken', async () => {
    const systemToken = 'test-token';
    const projectId = 'test-project';
    const workspaceId = 1;
    const createError = new Error('Token creation failed');

    createDatabaseTokenMock.mockRejectedValue(createError);

    await expect(
      generateDatabaseToken(systemToken, projectId, workspaceId),
    ).rejects.toThrow('Token creation failed');

    expect(createDatabaseTokenMock).toHaveBeenCalledTimes(1);
    expect(createDatabaseTokenMock).toHaveBeenCalledWith({
      name: 'Project_test-project',
      workspaceId,
      systemToken,
    });
  });
});
