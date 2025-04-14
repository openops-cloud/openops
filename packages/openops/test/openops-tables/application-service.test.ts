const makeOpenOpsTablesGetMock = jest.fn();
const createAxiosHeadersMock = jest.fn();
jest.mock('../../src/lib/openops-tables/requests-helpers', () => ({
  makeOpenOpsTablesGet: makeOpenOpsTablesGetMock,
  createAxiosHeaders: createAxiosHeadersMock,
}));

import {
  getDefaultDatabaseId,
  OPENOPS_DEFAULT_DATABASE_NAME,
} from '../../src/lib/openops-tables/applications-service';
import { Application } from '../../src/lib/openops-tables/types/application';

describe('getDefaultDatabaseId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should get default database ID', async () => {
    const mockApplications: Application[] = [
      {
        id: 1,
        name: OPENOPS_DEFAULT_DATABASE_NAME,
        type: 'database',
        order: 1,
        group: { id: 1, name: 'defaultGroup' },
        workspace: { id: 1, name: 'defaultWorkspace' },
      },
      {
        id: 2,
        name: 'Another Database',
        type: 'database',
        order: 2,
        group: { id: 2, name: 'defaultGroup' },
        workspace: { id: 2, name: 'defaultWorkspace' },
      },
    ];

    makeOpenOpsTablesGetMock.mockResolvedValue(mockApplications);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await getDefaultDatabaseId('token');

    expect(result).toBe(1);
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/applications/',
      'some header',
      undefined,
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });

  test('Should throw if default database not found', async () => {
    const mockApplications: Application[] = [
      {
        id: 2,
        name: 'Another Database',
        type: 'database',
        order: 2,
        group: { id: 2, name: 'defaultGroup' },
        workspace: { id: 2, name: 'defaultWorkspace' },
      },
    ];

    makeOpenOpsTablesGetMock.mockResolvedValue(mockApplications);
    createAxiosHeadersMock.mockReturnValue('some header');

    await expect(getDefaultDatabaseId('token')).rejects.toThrowError(
      'Default database not found',
    );
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/applications/',
      'some header',
      undefined,
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });
});
