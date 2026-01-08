import {
  createAxiosHeaders,
  makeOpenOpsTablesRequest,
  TablesMcpEndpoint,
  TokenOrResolver,
} from '@openops/common';

export async function getMcpEndpointList(
  tokenOrResolver: TokenOrResolver,
): Promise<TablesMcpEndpoint[]> {
  return makeOpenOpsTablesRequest<TablesMcpEndpoint[]>(
    'get',
    `api/mcp/endpoints/`,
    undefined,
    createAxiosHeaders(tokenOrResolver),
  );
}
