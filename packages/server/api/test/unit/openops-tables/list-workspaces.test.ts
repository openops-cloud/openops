const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  makeOpenOpsTablesGet: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

import { AxiosHeaders } from 'axios';
import { Workspace } from '../../../src/app/openops-tables/create-workspace';
import { listWorkspaces } from '../../../src/app/openops-tables/list-workspaces';

describe('listWorkspaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all workspaces', async () => {
    const token = 'test_token';
    const mockWorkspaces: Workspace[] = [
      {
        id: 1,
        name: 'Workspace 1',
        order: 1,
        permissions: 'admin',
      },
      {
        id: 2,
        name: 'Workspace 2',
        order: 2,
        permissions: 'member',
      },
      {
        id: 3,
        name: 'Workspace 3',
        order: 3,
        permissions: 'viewer',
      },
    ];

    openopsCommonMock.makeOpenOpsTablesGet.mockResolvedValue([mockWorkspaces]);

    const result = await listWorkspaces(token);

    expect(result).toHaveLength(3);
    expect(result).toEqual(mockWorkspaces);
    expect(openopsCommonMock.makeOpenOpsTablesGet).toHaveBeenCalledWith(
      'api/workspaces/',
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      }),
    );
  });

  it('should return empty array when no workspaces exist', async () => {
    const token = 'test_token';
    const mockWorkspaces: Workspace[] = [];

    openopsCommonMock.makeOpenOpsTablesGet.mockResolvedValue(mockWorkspaces);

    const result = await listWorkspaces(token);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
    expect(openopsCommonMock.makeOpenOpsTablesGet).toHaveBeenCalledWith(
      'api/workspaces/',
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      }),
    );
  });

  it('should return single workspace when only one exists', async () => {
    const token = 'test_token';
    const mockWorkspaces: Workspace[] = [
      {
        id: 1,
        name: 'Single Workspace',
        order: 1,
        permissions: 'admin',
      },
    ];

    openopsCommonMock.makeOpenOpsTablesGet.mockResolvedValue(mockWorkspaces);

    const result = await listWorkspaces(token);

    expect(result).toHaveLength(1);
    expect(result).toEqual(mockWorkspaces);
    expect(openopsCommonMock.makeOpenOpsTablesGet).toHaveBeenCalledWith(
      'api/workspaces/',
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      }),
    );
  });
});
