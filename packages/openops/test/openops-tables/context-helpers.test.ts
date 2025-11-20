const getProjectDatabaseTokenForBlockMock = jest.fn();
jest.mock('../../src/lib/openops-tables/get-encrypted-token-for-block', () => ({
  getProjectDatabaseTokenForBlock: getProjectDatabaseTokenForBlockMock,
}));

import { ActionContext } from '@openops/blocks-framework';
import {
  createFieldsCacheKey,
  createTableCacheKey,
  getTokenFromContext,
} from '../../src/lib/openops-tables/context-helpers';

describe('context-helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTokenFromContext', () => {
    it('should retrieve token using context properties', async () => {
      const context = {
        server: {
          apiUrl: 'https://api.example.com',
          token: 'test-auth-token',
        },
        project: {
          id: 'project-123',
        },
      } as ActionContext;

      getProjectDatabaseTokenForBlockMock.mockResolvedValue(
        'database-token-123',
      );

      const token = await getTokenFromContext(context);

      expect(token).toBe('database-token-123');
      expect(getProjectDatabaseTokenForBlockMock).toHaveBeenCalledWith(
        'https://api.example.com',
        'test-auth-token',
        'project-123',
      );
    });
  });

  describe('createTableCacheKey', () => {
    it('should create a consistent cache key for tables', () => {
      const runId = 'run-abc-123';
      const tableName = 'MyTable';

      const key = createTableCacheKey(runId, tableName);

      expect(key).toBe('run-abc-123-table-MyTable');
    });

    it('should handle different table names', () => {
      const runId = 'run-xyz-789';
      const tableName1 = 'Users';
      const tableName2 = 'Orders';

      const key1 = createTableCacheKey(runId, tableName1);
      const key2 = createTableCacheKey(runId, tableName2);

      expect(key1).toBe('run-xyz-789-table-Users');
      expect(key2).toBe('run-xyz-789-table-Orders');
      expect(key1).not.toBe(key2);
    });
  });

  describe('createFieldsCacheKey', () => {
    it('should create a consistent cache key for fields', () => {
      const runId = 'run-def-456';
      const tableId = 42;

      const key = createFieldsCacheKey(runId, tableId);

      expect(key).toBe('run-def-456-42-fields');
    });

    it('should handle different table IDs', () => {
      const runId = 'run-ghi-789';
      const tableId1 = 10;
      const tableId2 = 20;

      const key1 = createFieldsCacheKey(runId, tableId1);
      const key2 = createFieldsCacheKey(runId, tableId2);

      expect(key1).toBe('run-ghi-789-10-fields');
      expect(key2).toBe('run-ghi-789-20-fields');
      expect(key1).not.toBe(key2);
    });
  });
});
