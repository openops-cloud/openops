import { OpenAPI } from 'openapi-types';
import {
  buildMcpDocument,
  findMissingOperations,
  MCP_EXTENSION_KEY,
} from '../../../src/app/mcp/mcp-document';
import { McpProfile } from '../../../src/app/mcp/mcp-profile';

const DOCUMENT = {
  openapi: '3.1.0',
  info: { title: 'OpenOps', version: '0.0.0' },
  components: { schemas: { flow: { type: 'object' } } },
  paths: {
    '/v1/flows/': {
      get: { operationId: 'listFlows' },
      post: { operationId: 'createFlow' },
    },
    '/v1/flows/{id}': { get: { operationId: 'getFlow' } },
    '/v1/users/': { get: { operationId: 'listUsers' } },
  },
} as unknown as OpenAPI.Document;

const PROFILE: McpProfile = {
  operations: {
    '/v1/flows/': ['get'],
    '/v1/flows/{id}': ['get'],
  },
  multiProject: false,
};

describe('buildMcpDocument', () => {
  it('keeps only the methods the profile names', () => {
    const document = buildMcpDocument(DOCUMENT, PROFILE);

    expect(Object.keys(document.paths?.['/v1/flows/'] ?? {})).toEqual(['get']);
  });

  it('drops paths the profile does not name', () => {
    const document = buildMcpDocument(DOCUMENT, PROFILE);

    expect(Object.keys(document.paths ?? {})).toEqual([
      '/v1/flows/',
      '/v1/flows/{id}',
    ]);
  });

  it('preserves everything outside paths, so the document stays valid', () => {
    const document = buildMcpDocument(DOCUMENT, PROFILE);

    expect(document.info).toEqual({ title: 'OpenOps', version: '0.0.0' });
    // `components` sits on the v3 half of the OpenAPI.Document union only.
    expect((document as unknown as Record<string, unknown>).components).toEqual(
      {
        schemas: { flow: { type: 'object' } },
      },
    );
  });

  it('declares the profile capability so the MCP server needs no edition config', () => {
    const single = buildMcpDocument(DOCUMENT, PROFILE);
    const multi = buildMcpDocument(DOCUMENT, {
      ...PROFILE,
      multiProject: true,
    });

    expect(
      (single as unknown as Record<string, unknown>)[MCP_EXTENSION_KEY],
    ).toEqual({ multiProject: false });
    expect(
      (multi as unknown as Record<string, unknown>)[MCP_EXTENSION_KEY],
    ).toEqual({ multiProject: true });
  });

  it('does not mutate the document it was given', () => {
    buildMcpDocument(DOCUMENT, PROFILE);

    expect(Object.keys(DOCUMENT.paths ?? {})).toHaveLength(3);
  });
});

describe('findMissingOperations', () => {
  it('reports nothing when every named operation exists', () => {
    expect(findMissingOperations(DOCUMENT, PROFILE)).toEqual([]);
  });

  it('names a path the document does not expose', () => {
    const profile: McpProfile = {
      operations: { '/mcp/flows/': ['get', 'post'] },
      multiProject: true,
    };

    expect(findMissingOperations(DOCUMENT, profile)).toEqual([
      'GET /mcp/flows/',
      'POST /mcp/flows/',
    ]);
  });

  it('names a method the document does not expose on a path it has', () => {
    const profile: McpProfile = {
      operations: { '/v1/flows/{id}': ['get', 'delete'] },
      multiProject: false,
    };

    expect(findMissingOperations(DOCUMENT, profile)).toEqual([
      'DELETE /v1/flows/{id}',
    ]);
  });
});
