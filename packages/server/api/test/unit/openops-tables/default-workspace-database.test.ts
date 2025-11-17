import { createDatabaseToken } from '../../../src/app/openops-tables/create-database-token';

const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  makeOpenOpsTablesPost: jest.fn(),
  makeOpenOpsTablesPatch: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

const createDbMock = jest.fn();
jest.mock('../../../src/app/openops-tables/create-database', () => {
  return { createDatabase: createDbMock };
});

const createTableMock = jest.fn();
jest.mock('../../../src/app/openops-tables/create-table', () => {
  return { createTable: createTableMock };
});

const createWorkspaceMock = jest.fn();
jest.mock('../../../src/app/openops-tables/create-workspace', () => {
  return { createWorkspace: createWorkspaceMock };
});

const listWorkspacesMock = jest.fn();
jest.mock('../../../src/app/openops-tables/list-workspaces', () => {
  return { listWorkspaces: listWorkspacesMock };
});

const listDatabasesMock = jest.fn();
jest.mock('../../../src/app/openops-tables/list-databases', () => {
  return { listDatabases: listDatabasesMock };
});

const listDatabaseTokensMock = jest.fn();
jest.mock('../../../src/app/openops-tables/list-database-tokens', () => {
  return { listDatabaseTokens: listDatabaseTokensMock };
});

const createDatabaseTokenMock = jest.fn();
jest.mock('../../../src/app/openops-tables/create-database-token', () => {
  return { createDatabaseToken: createDatabaseTokenMock };
});

import { OPENOPS_DEFAULT_DATABASE_NAME } from '@openops/common';
import { createDefaultWorkspaceAndDatabase } from '../../../src/app/openops-tables/default-workspace-database';

describe('createAdminInOpenOpsTables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const token = 'some token';

  it('should successfully create new table Opportunities', async () => {
    listDatabasesMock.mockResolvedValue([]);
    listWorkspacesMock.mockResolvedValue([]);
    listDatabaseTokensMock.mockResolvedValue([]);
    createWorkspaceMock.mockResolvedValue({ id: 1 });
    createDbMock.mockResolvedValue({ id: 2 });
    createTableMock.mockResolvedValue({ id: 3 });
    createDatabaseTokenMock.mockResolvedValue({ key: 'key' });

    await createDefaultWorkspaceAndDatabase(token);

    expect(createWorkspaceMock).toHaveBeenCalledTimes(1);
    expect(createWorkspaceMock).toHaveBeenCalledWith(
      'OpenOps Workspace',
      'some token',
    );
    expect(createDbMock).toHaveBeenCalledTimes(1);
    expect(createDbMock).toHaveBeenCalledWith(
      1,
      OPENOPS_DEFAULT_DATABASE_NAME,
      'some token',
    );
  });

  it('should throw if something fails', async () => {
    listWorkspacesMock.mockResolvedValue([]);
    createWorkspaceMock.mockRejectedValue(new Error('some error'));

    await expect(createDefaultWorkspaceAndDatabase(token)).rejects.toThrow(
      'some error',
    );
  });
});
