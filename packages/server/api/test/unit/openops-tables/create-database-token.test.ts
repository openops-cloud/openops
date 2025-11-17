const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  makeOpenOpsTablesPost: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

import { AxiosHeaders } from 'axios';
import { createDatabaseToken } from '../../../src/app/openops-tables/create-database-token';

describe('createDatabaseToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the created token on successful creation', async () => {
    const params = {
      name: 'Test Token',
      workspaceId: 1,
      systemToken: 'test_system_token',
    };
    const mockTokenResponse = {
      id: 1,
      name: 'Test Token',
      workspace: 1,
      key: 'test_database_token_key',
      permissions: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
    };

    openopsCommonMock.makeOpenOpsTablesPost.mockResolvedValue(
      mockTokenResponse,
    );

    const result = await createDatabaseToken(params);

    expect(result).toEqual(mockTokenResponse);
    expect(openopsCommonMock.makeOpenOpsTablesPost).toHaveBeenCalledWith(
      'api/database/tokens/',
      {
        name: params.name,
        workspace: params.workspaceId,
      },
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `JWT ${params.systemToken}`,
      }),
    );
  });
});
