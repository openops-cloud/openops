const findMock = jest.fn();
const projectRepoMock = jest.fn().mockReturnValue({
  find: findMock,
});

jest.mock('../../../src/app/project/project-service', () => ({
  projectRepo: projectRepoMock,
}));

import { applyToEachTablesDatabase } from '../../../src/app/database/seeds/tables-database-iterator';

describe('Tables database iterator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('applyToEachTablesDatabase', () => {
    it('applies a function to each tables database context', async () => {
      const contexts = [
        {
          tablesWorkspaceId: 'w1',
          tablesDatabaseId: 'db1',
          tablesDatabaseToken: 'token1',
        },
        {
          tablesWorkspaceId: 'w2',
          tablesDatabaseId: 'db2',
          tablesDatabaseToken: 'token2',
        },
      ];
      findMock.mockResolvedValue(contexts);
      const runMock = jest.fn().mockResolvedValue(undefined);

      await applyToEachTablesDatabase(runMock);

      expect(runMock).toHaveBeenCalledTimes(2);
      expect(runMock).toHaveBeenNthCalledWith(1, contexts[0]);
      expect(runMock).toHaveBeenNthCalledWith(2, contexts[1]);
    });
  });
});
