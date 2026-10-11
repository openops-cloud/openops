export type McpProfileName = 'chat' | 'agent';

export type HttpMethod =
  'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace';

export type McpProfile = {
  operations: Record<string, HttpMethod[]>;
  multiProject: boolean;
};

export type McpProfiles = Record<McpProfileName, McpProfile>;

const CHAT_OPERATIONS: Record<string, HttpMethod[]> = {
  '/v1/files/{fileId}': ['get'],
  '/v1/flow-versions/': ['get'],
  '/v1/flows/': ['get'],
  '/v1/flows/count': ['get'],
  '/v1/flows/{id}': ['get'],
  '/v1/blocks/': ['get'],
  '/v1/blocks/categories': ['get'],
  '/v1/blocks/options': ['post'],
  '/v1/blocks/{name}': ['get'],
  '/v1/blocks/{scope}/{name}': ['get'],
  '/v1/flow-runs/': ['get'],
  '/v1/flow-runs/{id}': ['get'],
  '/v1/flow-runs/{id}/retry': ['post'],
  '/v1/app-connections/': ['get', 'patch'],
  '/v1/app-connections/{id}': ['get'],
  '/v1/app-connections/metadata': ['get'],
};

/**
 * Read-only access to OpenOps Tables. Exposed to external agents only for now; the
 * built-in chat still reads Tables through Baserow's own MCP endpoint (OPS-4907 tracks
 * moving it over). Exported so the enterprise profiles can include the same surface.
 */
export const TABLES_OPERATIONS: Record<string, HttpMethod[]> = {
  '/v1/tables/': ['get'],
  '/v1/tables/{id}': ['get'],
  '/v1/tables/{id}/columns': ['get'],
  '/v1/tables/{id}/rows/query': ['post'],
};

export const communityMcpProfiles: McpProfiles = {
  chat: { operations: CHAT_OPERATIONS, multiProject: false },
  agent: {
    operations: { ...CHAT_OPERATIONS, ...TABLES_OPERATIONS },
    multiProject: false,
  },
};
