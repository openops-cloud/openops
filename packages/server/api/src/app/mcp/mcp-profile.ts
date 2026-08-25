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

export const communityMcpProfiles: McpProfiles = {
  chat: { operations: CHAT_OPERATIONS, multiProject: false },
  agent: { operations: CHAT_OPERATIONS, multiProject: false },
};
