import { AppSystemProp, system } from '@openops/server-shared';
import { ToolSet } from 'ai';
import { FastifyInstance } from 'fastify';
import { getCostTools } from './cost-tools';
import { getDocsTools } from './docs-tools';
import { safeGetTools } from './load-tools-guard';
import { getOpenOpsTools } from './openops-tools';
import { getSupersetTools } from './superset-tools';
import { getTablesTools } from './tables-tools';
import { MCPTool } from './types';

export const startMCPTools = async (
  app: FastifyInstance,
  authToken: string,
  projectId: string,
): Promise<{
  mcpClients: unknown[];
  tools: ToolSet;
}> => {
  const docsTools = await safeGetTools('docs', getDocsTools);
  const tablesTools = await safeGetTools('tables', getTablesTools);
  const openopsTools = await safeGetTools('openops', () =>
    getOpenOpsTools(app, authToken),
  );

  const { costExplorer, costAnalysis } = await getCostTools(projectId);
  const costExplorerTools = {
    client: costExplorer.client,
    toolSet: costExplorer.toolSet,
  };
  const costAnalysisTools = {
    client: costAnalysis.client,
    toolSet: costAnalysis.toolSet,
  };

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
    ...openopsTools.toolSet,
    ...costExplorerTools.toolSet,
    ...costAnalysisTools.toolSet,
  } as ToolSet;

  return {
    mcpClients: [
      supersetTools.client,
      docsTools.client,
      tablesTools.client,
      openopsTools.client,
      costExplorerTools.client,
      costAnalysisTools.client,
    ],
    tools: toolSet,
  };
};
