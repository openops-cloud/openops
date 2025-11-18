const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  makeOpenOpsTablesGet: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

import { DatabaseToken } from '@openops/common';
import { AxiosHeaders } from 'axios';
import { listDatabaseTokens } from '../../../src/app/openops-tables/list-database-tokens';

describe('listDatabases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return only database tokens for the provided workspace', async () => {
    const workspaceId = 1;
    const token = 'test_token';
    const mockApplications: DatabaseToken[] = [
      {
        id: 1,
        name: 'Token 1',
        workspace: workspaceId,
        key: 'key',
        permissions: { create: true, read: true, update: true, delete: true },
      },
      {
        id: 2,
        name: 'Token 2',
        workspace: 2,
        key: 'key',
        permissions: { create: true, read: true, update: true, delete: true },
      },
      {
        id: 3,
        name: 'Token 3',
        workspace: workspaceId,
        key: 'key',
        permissions: { create: true, read: true, update: true, delete: true },
      },
      {
        id: 4,
        name: 'Token 4',
        workspace: 2,
        key: 'key',
        permissions: { create: true, read: true, update: true, delete: true },
      },
    ];

    openopsCommonMock.makeOpenOpsTablesGet.mockResolvedValue([
      mockApplications,
    ]);

    const result = await listDatabaseTokens(workspaceId, token);

    expect(result).toHaveLength(2);
    expect(result).toEqual([mockApplications[0], mockApplications[2]]);
    expect(openopsCommonMock.makeOpenOpsTablesGet).toHaveBeenCalledWith(
      'api/database/tokens/',
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      }),
    );
  });

  it('should return empty array when no database tokens exist for the workspace', async () => {
    const workspaceId = 1;
    const token = 'test_token';
    const mockApplications: DatabaseToken[] = [
      {
        id: 4,
        name: 'Token 4',
        workspace: 2,
        key: 'key',
        permissions: { create: true, read: true, update: true, delete: true },
      },
    ];

    openopsCommonMock.makeOpenOpsTablesGet.mockResolvedValue(mockApplications);

    const result = await listDatabaseTokens(workspaceId, token);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
    expect(openopsCommonMock.makeOpenOpsTablesGet).toHaveBeenCalledWith(
      'api/database/tokens/',
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      }),
    );
  });

  it('should return empty array when no database tokens exist', async () => {
    const workspaceId = 1;
    const token = 'test_token';
    const mockApplications: DatabaseToken[] = [];

    openopsCommonMock.makeOpenOpsTablesGet.mockResolvedValue(mockApplications);

    const result = await listDatabaseTokens(workspaceId, token);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
    expect(openopsCommonMock.makeOpenOpsTablesGet).toHaveBeenCalledWith(
      'api/database/tokens/',
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      }),
    );
  });
});
