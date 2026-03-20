import { ToolSet } from 'ai';
import { FastifyInstance } from 'fastify';
import { getCostTools } from './cost-tools';
import { getDocsTools } from './docs-tools';
import { safeGetTools } from './load-tools-guard';
import { getOpenOpsTools } from './openops-tools';
import { getTablesTools } from './tables-tools';

export const startMCPTools = async (
  app: FastifyInstance,
  authToken: string,
  projectId: string,
): Promise<{
  mcpClients: unknown[];
  tools: ToolSet;
}> => {
  const docsTools = await safeGetTools('docs', getDocsTools);
  const tablesTools = await safeGetTools('tables', () =>
    getTablesTools(projectId),
  );
  const openopsTools = await safeGetTools('openops', () =>
    getOpenOpsTools(app, authToken),
  );

  const { costExplorer, costAnalysis, billingAndCostManagement } =
    await getCostTools(projectId);
  const costExplorerTools = {
    client: costExplorer.client,
    toolSet: costExplorer.toolSet,
  };
  const costAnalysisTools = {
    client: costAnalysis.client,
    toolSet: costAnalysis.toolSet,
  };
  const billingAndCostManagementTools = {
    client: billingAndCostManagement.client,
    toolSet: billingAndCostManagement.toolSet,
  };

  const toolSet = {
    ...docsTools.toolSet,
    ...tablesTools.toolSet,
    ...openopsTools.toolSet,
    ...costExplorerTools.toolSet,
    ...costAnalysisTools.toolSet,
    ...billingAndCostManagementTools.toolSet,
  } as ToolSet;

  return {
    mcpClients: [
      docsTools.client,
      tablesTools.client,
      openopsTools.client,
      costExplorerTools.client,
      costAnalysisTools.client,
      billingAndCostManagementTools.client,
    ],
    tools: toolSet,
  };
};
