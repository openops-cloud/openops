import {
  createAxiosHeaders,
  makeOpenOpsTablesPost,
  TablesMcpEndpoint,
  TokenOrResolver,
} from '@openops/common';

export async function createMcpEndpoint(
  tokenOrResolver: TokenOrResolver,
  workspaceId: number,
): Promise<void> {
  const requestBody = {
    name: 'OpenOps MCP Endpoint',
    workspace_id: workspaceId,
  };

  await makeOpenOpsTablesPost<TablesMcpEndpoint>(
    `api/mcp/endpoints/`,
    requestBody,
    createAxiosHeaders(tokenOrResolver),
  );
}
