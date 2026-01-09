import { resolveTokenProvider } from '@openops/common';
import { ensureTablesMcpEndpointExists } from '../../../src/app/database/seeds/create-open-ops-tables-mcp-endpoint';
import { applyToEachTablesDatabase } from '../../../src/app/database/seeds/tables-database-iterator';
import { openopsTables } from '../../../src/app/openops-tables';

jest.mock('@openops/common', () => ({
  resolveTokenProvider: jest.fn(),
}));

jest.mock('@openops/server-shared', () => ({
  logger: {
    info: jest.fn(),
  },
}));

jest.mock('../../../src/app/openops-tables', () => ({
  openopsTables: {
    getMcpEndpointList: jest.fn(),
    createMcpEndpoint: jest.fn(),
  },
}));

jest.mock('../../../src/app/database/seeds/tables-database-iterator', () => ({
  applyToEachTablesDatabase: jest.fn(),
}));

describe('ensureTablesMcpEndpointExists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip creating MCP endpoint if it already exists', async () => {
    const tablesContext = {
      tablesWorkspaceId: 123,
      tablesDatabaseId: 456,
      tablesDatabaseToken: { encryptedValue: 'token' },
    };

    (applyToEachTablesDatabase as jest.Mock).mockImplementation(
      async (callback) => {
        await callback(tablesContext);
      },
    );

    const tokenOrResolver = 'resolved-token';
    (resolveTokenProvider as jest.Mock).mockResolvedValue(tokenOrResolver);

    (openopsTables.getMcpEndpointList as jest.Mock).mockResolvedValue([
      { workspace_id: 123 },
    ]);

    await ensureTablesMcpEndpointExists();

    expect(openopsTables.getMcpEndpointList).toHaveBeenCalledWith(
      tokenOrResolver,
    );
    expect(openopsTables.createMcpEndpoint).not.toHaveBeenCalled();
  });

  it('should create MCP endpoint if it does not exist', async () => {
    const tablesContext = {
      tablesWorkspaceId: 123,
      tablesDatabaseId: 456,
      tablesDatabaseToken: { encryptedValue: 'token' },
    };

    (applyToEachTablesDatabase as jest.Mock).mockImplementation(
      async (callback) => {
        await callback(tablesContext);
      },
    );

    const tokenOrResolver = 'resolved-token';
    (resolveTokenProvider as jest.Mock).mockResolvedValue(tokenOrResolver);

    (openopsTables.getMcpEndpointList as jest.Mock).mockResolvedValue([
      { workspace_id: 999 },
    ]);

    await ensureTablesMcpEndpointExists();

    expect(openopsTables.getMcpEndpointList).toHaveBeenCalledWith(
      tokenOrResolver,
    );
    expect(openopsTables.createMcpEndpoint).toHaveBeenCalledWith(
      tokenOrResolver,
      tablesContext.tablesWorkspaceId,
    );
  });
});
