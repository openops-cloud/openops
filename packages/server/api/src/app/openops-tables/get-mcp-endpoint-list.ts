import {
  createAxiosHeaders,
  makeOpenOpsTablesRequest,
  TablesMcpEndpoint,
} from '@openops/common';

export async function getMcpEndpointList(
  token: string,
): Promise<TablesMcpEndpoint[]> {
  return makeOpenOpsTablesRequest<TablesMcpEndpoint[]>(
    'get',
    `api/mcp/endpoints/`,
    undefined,
    createAxiosHeaders(token),
  );
}
