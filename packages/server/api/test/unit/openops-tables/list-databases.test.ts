const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  makeOpenOpsTablesGet: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

import { Application } from '@openops/common';
import { AxiosHeaders } from 'axios';
import { listDatabases } from '../../../src/app/openops-tables/list-databases';

describe('listDatabases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return only database type applications', async () => {
    const workspaceId = 1;
    const token = 'test_token';
    const mockApplications: Application[] = [
      {
        id: 1,
        name: 'Database 1',
        order: 1,
        type: 'database',
        group: { id: 1, name: 'Group 1' },
        workspace: { id: 1, name: 'Workspace 1' },
      },
      {
        id: 2,
        name: 'App 1',
        order: 2,
        type: 'application',
        group: { id: 1, name: 'Group 1' },
        workspace: { id: 1, name: 'Workspace 1' },
      },
      {
        id: 3,
        name: 'Database 2',
        order: 3,
        type: 'database',
        group: { id: 1, name: 'Group 1' },
        workspace: { id: 1, name: 'Workspace 1' },
      },
    ];

    openopsCommonMock.makeOpenOpsTablesGet.mockResolvedValue([
      mockApplications,
    ]);

    const result = await listDatabases(workspaceId, token);

    expect(result).toHaveLength(2);
    expect(result).toEqual([mockApplications[0], mockApplications[2]]);
    expect(openopsCommonMock.makeOpenOpsTablesGet).toHaveBeenCalledWith(
      'api/applications/workspace/1/',
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      }),
    );
  });

  it('should return empty array when no databases exist', async () => {
    const workspaceId = 1;
    const token = 'test_token';
    const mockApplications: Application[] = [
      {
        id: 1,
        name: 'App 1',
        order: 1,
        type: 'application',
        group: { id: 1, name: 'Group 1' },
        workspace: { id: 1, name: 'Workspace 1' },
      },
    ];

    openopsCommonMock.makeOpenOpsTablesGet.mockResolvedValue(mockApplications);

    const result = await listDatabases(workspaceId, token);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
    expect(openopsCommonMock.makeOpenOpsTablesGet).toHaveBeenCalledWith(
      'api/applications/workspace/1/',
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      }),
    );
  });

  it('should return empty array when no applications exist', async () => {
    const workspaceId = 1;
    const token = 'test_token';
    const mockApplications: Application[] = [];

    openopsCommonMock.makeOpenOpsTablesGet.mockResolvedValue(mockApplications);

    const result = await listDatabases(workspaceId, token);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
    expect(openopsCommonMock.makeOpenOpsTablesGet).toHaveBeenCalledWith(
      'api/applications/workspace/1/',
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      }),
    );
  });
});
