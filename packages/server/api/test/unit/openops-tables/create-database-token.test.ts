const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  makeOpenOpsTablesPost: jest.fn(),
  createAxiosHeaders: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

import { AxiosHeaders } from 'axios';
import { createDatabaseToken } from '../../../src/app/openops-tables/create-database-token';

describe('createDatabaseToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the created token on successful creation', async () => {
    const token = 'test_system_token';
    const workspaceId = 1;

    const mockHeaders = new AxiosHeaders({
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
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

    const result = await createDatabaseToken(workspaceId, token);

    expect(result).toEqual(mockTokenResponse);
    expect(openopsCommonMock.createAxiosHeaders).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.createAxiosHeaders).toHaveBeenCalledWith(token);
    expect(openopsCommonMock.makeOpenOpsTablesPost).toHaveBeenCalledWith(
      'api/database/tokens/',
      {
        name: 'OpenOps Token',
        workspace: workspaceId,
      },
      mockHeaders,
    );
  });
});
