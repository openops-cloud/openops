import { AppSystemProp, logger, system } from '@openops/server-shared';
import { ToolSet } from 'ai';
import { getDocsTools } from './docs-tools';
import { getSupersetTools } from './superset-tools';
import { getTablesTools } from './tables-tools';

export type MCPTool = {
  client: unknown;
  toolSet: ToolSet;
};

export const getMCPTools = async (): Promise<{
  mcpClients: unknown[];
  tools: ToolSet;
}> => {
  const docsTools = await safeGetTools('docs', getDocsTools);
  const tablesTools = await safeGetTools('tables', getTablesTools);

  const loadExperimentalTools = system.getBoolean(
    AppSystemProp.LOAD_EXPERIMENTAL_MCP_TOOLS,
  );

  let supersetTools: Partial<MCPTool> = {
    client: undefined,
    toolSet: {},
  };

  if (loadExperimentalTools) {
    supersetTools = await safeGetTools('superset', getSupersetTools);
  }

  const toolSet = {
    ...supersetTools.toolSet,
    ...docsTools.toolSet,
    ...tablesTools.toolSet,
  } as ToolSet;

  return {
    mcpClients: [supersetTools.client, docsTools.client, tablesTools.client],
    tools: toolSet,
  };
};

async function safeGetTools(
  name: string,
  loader: () => Promise<MCPTool>,
): Promise<Partial<MCPTool>> {
  try {
    const mcpTool = await loader();

    logger.debug(`Loaded tools for ${name}:`, {
      keys: Object.keys(mcpTool.toolSet),
    });

    return mcpTool;
  } catch (error) {
    logger.error(`Error loading tools for ${name}:`, error);
    return {};
  }
}
