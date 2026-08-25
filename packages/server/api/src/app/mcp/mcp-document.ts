import { OpenAPI } from 'openapi-types';
import { McpProfile } from './mcp-profile';

export const MCP_EXTENSION_KEY = 'x-openops-mcp';

/**
 * Reduce the document to one profile's operations. The MCP server consumes this instead of
 * holding a second allow-list, so the two cannot disagree.
 */
export function buildMcpDocument(
  document: OpenAPI.Document,
  profile: McpProfile,
): OpenAPI.Document {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const [path, operations] of Object.entries(document.paths ?? {})) {
    const allowedMethods = profile.operations[path];

    if (!allowedMethods || !operations) {
      continue;
    }

    const selected: Record<string, unknown> = {};

    for (const [method, operation] of Object.entries(operations)) {
      if (allowedMethods.includes(method.toLowerCase())) {
        selected[method] = operation;
      }
    }

    if (Object.keys(selected).length > 0) {
      paths[path] = selected;
    }
  }

  // A record because `OpenAPI.Document` is a v2|v3 union that admits neither a vendor
  // extension key nor a rebuilt `paths`.
  const served: Record<string, unknown> = {
    ...document,
    paths,
    [MCP_EXTENSION_KEY]: { multiProject: profile.multiProject },
  };

  return served as unknown as OpenAPI.Document;
}

/** Operations a profile names that the document does not contain — a typo, or another
 * edition's path. */
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
