import { TablesServerContext } from '@openops/common';
import { projectRepo } from '../../project/project-service';

const listTablesDatabases = async (): Promise<TablesServerContext[]> => {
  const projects = await projectRepo().find({
    select: ['tablesDatabaseId', 'tablesDatabaseToken'],
  });

  return projects.map(({ tablesDatabaseId, tablesDatabaseToken }) => ({
    tablesDatabaseId,
    tablesDatabaseToken,
  }));
};

export const applyToEachTablesDatabase = async (
  run: (tablesContext: TablesServerContext) => Promise<void>,
): Promise<void> => {
  const tablesContexts = await listTablesDatabases();

  for (const tablesContext of tablesContexts) {
    await run(tablesContext);
  }
};
