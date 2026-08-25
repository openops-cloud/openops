export type McpProfileName = 'chat' | 'agent';

export type McpProfile = {
  /** Allowed HTTP methods per path, lower-cased the way OpenAPI keys operations. */
  operations: Record<string, string[]>;
  /** Whether agents on this profile may act in more than one project. */
  multiProject: boolean;
};

export type McpProfiles = Record<McpProfileName, McpProfile>;

/** Read-mostly: the chat reasons about flows that exist, it does not author them. */
const CHAT_OPERATIONS: Record<string, string[]> = {
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
  // One project per organization in this edition, so an agent has nowhere to switch to.
  agent: { operations: CHAT_OPERATIONS, multiProject: false },
};
