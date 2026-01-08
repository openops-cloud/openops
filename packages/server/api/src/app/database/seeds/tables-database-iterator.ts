import { EncryptedObject } from '@openops/shared';
import { projectRepo } from '../../project/project-service';

type TablesContext = {
  tablesDatabaseId: number;
  tablesWorkspaceId: number;
  tablesDatabaseToken: EncryptedObject;
};

const listTablesDatabases = async (): Promise<TablesContext[]> => {
  const projects = await projectRepo().find({
    select: ['tablesWorkspaceId', 'tablesDatabaseId', 'tablesDatabaseToken'],
  });

  return projects
    .filter(
      ({ tablesWorkspaceId, tablesDatabaseId, tablesDatabaseToken }) =>
        tablesWorkspaceId != null &&
        tablesDatabaseId != null &&
        tablesDatabaseToken != null,
    )
    .map(({ tablesWorkspaceId, tablesDatabaseId, tablesDatabaseToken }) => ({
      tablesWorkspaceId,
      tablesDatabaseId,
      tablesDatabaseToken,
    }));
};

export const applyToEachTablesDatabase = async (
  run: (tablesContext: TablesContext) => Promise<void>,
): Promise<void> => {
  const tablesContexts = await listTablesDatabases();

  for (const tablesContext of tablesContexts) {
    await run(tablesContext);
  }
};
