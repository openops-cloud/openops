const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  makeOpenOpsTablesPost: jest.fn(),
  createAxiosHeaders: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

import { AxiosHeaders } from 'axios';
import { createProjectDatabaseToken } from '../../../src/app/openops-tables/create-database-token';

describe('createProjectDatabaseToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the created token on successful creation', async () => {
    const params = {
      token: 'test_system_token',
      projectId: 'test-project-123',
      workspaceId: 1,
    };
    const mockHeaders = new AxiosHeaders({
      'Content-Type': 'application/json',
      Authorization: `JWT ${params.token}`,
    });
    const mockTokenResponse = {
      id: 1,
      name: 'Project_test-project-123',
      workspace: 1,
      key: 'test_database_token_key',
      permissions: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    };

    openopsCommonMock.createAxiosHeaders.mockReturnValue(mockHeaders);
    openopsCommonMock.makeOpenOpsTablesPost.mockResolvedValue(
      mockTokenResponse,
    );

    const result = await createProjectDatabaseToken(params);

    expect(result).toEqual(mockTokenResponse);
    expect(openopsCommonMock.createAxiosHeaders).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.createAxiosHeaders).toHaveBeenCalledWith(
      params.token,
    );
    expect(openopsCommonMock.makeOpenOpsTablesPost).toHaveBeenCalledWith(
      'api/database/tokens/',
      {
        name: 'Project_test-project-123',
        workspace: params.workspaceId,
      },
      mockHeaders,
    );
  });
});
