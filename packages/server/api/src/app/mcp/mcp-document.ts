import { OpenAPI } from 'openapi-types';
import { McpProfile } from './mcp-profile';

export const MCP_EXTENSION_KEY = 'x-openops-mcp';

export type McpDocument = Record<string, unknown>;

export function buildMcpDocument(
  document: OpenAPI.Document,
  profile: McpProfile,
): McpDocument {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const [path, operations] of Object.entries(document.paths ?? {})) {
    const allowedMethods = profile.operations[path];

    if (!allowedMethods || !operations) {
      continue;
    }

    const selected: Record<string, unknown> = {};

    for (const [method, operation] of Object.entries(operations)) {
      if (allowedMethods.some((allowed) => allowed === method.toLowerCase())) {
        selected[method] = operation;
      }
    }

    if (Object.keys(selected).length > 0) {
      paths[path] = selected;
    }
  }

  return {
    ...document,
    paths,
    [MCP_EXTENSION_KEY]: { multiProject: profile.multiProject },
  };
}

export function findMissingOperations(
  document: OpenAPI.Document,
  profile: McpProfile,
): string[] {
  const missing: string[] = [];

  for (const [path, methods] of Object.entries(profile.operations)) {
    const operations = document.paths?.[path] as
      Record<string, unknown> | undefined;

    for (const method of methods) {
      if (operations?.[method] === undefined) {
        missing.push(`${method.toUpperCase()} ${path}`);
      }
    }
  }

  return missing;
}
