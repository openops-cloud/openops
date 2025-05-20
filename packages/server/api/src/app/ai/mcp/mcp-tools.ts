import { AppSystemProp, logger, system } from '@openops/server-shared';
import { ToolSet } from 'ai';
import { getDocsTools } from './docs-tools';
import { getSupersetTools } from './superset-tools';
import { getTablesTools } from './tables-tools';

export const getMCPTools = async (): Promise<ToolSet> => {
  const docsTools = await safeGetTools('docs', getDocsTools);
  const tablesTools = await safeGetTools('tables', getTablesTools);

  const loadExperimentalTools = system.getBoolean(
    AppSystemProp.LOAD_EXPERIMENTAL_MCP_TOOLS,
  );

  let supersetTools = {};

  if (loadExperimentalTools) {
    supersetTools = await safeGetTools('superset', getSupersetTools);
  }

  const toolSet = {
    ...supersetTools,
    ...docsTools,
    ...tablesTools,
  } as ToolSet;

  return toolSet;
};

async function safeGetTools(
  name: string,
  loader: () => Promise<ToolSet>,
): Promise<Partial<ToolSet>> {
  try {
    const tools = await loader();
    logger.debug(`Loaded tools for ${name}:`, tools);
    return tools;
  } catch (error) {
    logger.error(`Error loading tools for ${name}:`, error);
    return {};
  }
}
