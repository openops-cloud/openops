import {
  createAxiosHeaders,
  makeOpenOpsTablesPost,
  TablesMcpEndpoint,
} from '@openops/common';

export async function createMcpEndpoint(
  workspaceId: number,
  token: string,
): Promise<void> {
  const requestBody = {
    name: 'OpenOps MCP Endpoint',
    workspace_id: workspaceId,
  };

  await makeOpenOpsTablesPost<TablesMcpEndpoint>(
    `api/mcp/endpoints/`,
    requestBody,
    createAxiosHeaders(token),
  );
}
