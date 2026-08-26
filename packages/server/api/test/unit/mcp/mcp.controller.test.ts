import swagger from '@fastify/swagger';
import { Type } from '@fastify/type-provider-typebox';
import fastify, { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { MCP_EXTENSION_KEY } from '../../../src/app/mcp/mcp-document';
import { mcpModule } from '../../../src/app/mcp/mcp.module';

/**
 * A stand-in for the real API: one operation the agent profile claims, one the chat
 * profile claims, and one neither does.
 */
async function buildApp(): Promise<FastifyInstance> {
  const app = fastify();

  await app.register(swagger, {
    openapi: { openapi: '3.1.0', info: { title: 'OpenOps', version: '0.0.0' } },
  });

  app.get(
    '/v1/flows/',
    {
      schema: {
        operationId: 'List Workflows',
        description: 'In both profiles',
      },
    },
    async () => [],
  );
  app.get(
    '/v1/organizations/',
    { schema: { description: 'In neither profile' } },
    async () => [],
  );
  app.post(
    '/v1/blocks/options',
    {
      schema: {
        operationId: 'Execute Block Properties',
        body: Type.Object({ name: Type.String() }),
      },
    },
    async () => ({}),
  );

  await app.register(mcpModule);
  await app.ready();

  return app;
}

describe('GET /v1/mcp/openapi.json', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => app.close());

  async function fetchDocument(
    query: string,
  ): Promise<Record<string, never> & { paths: Record<string, unknown> }> {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/mcp/openapi.json${query}`,
    });

    expect(response.statusCode).toBe(StatusCodes.OK);

    return response.json();
  }

  it('serves the operations the profile names', async () => {
    const document = await fetchDocument('?profile=chat');

    expect(Object.keys(document.paths).sort()).toEqual([
      '/v1/blocks/options',
      '/v1/flows/',
    ]);
  });

  it('never offers project switching, since this edition has one project', async () => {
    for (const query of ['?profile=chat', '?profile=agent']) {
      const document = await fetchDocument(query);

      expect(document[MCP_EXTENSION_KEY]).toEqual({ multiProject: false });
    }
  });

  it('gives both profiles the same surface in this edition', async () => {
    expect(Object.keys((await fetchDocument('?profile=agent')).paths)).toEqual(
      Object.keys((await fetchDocument('?profile=chat')).paths),
    );
  });

  it('defaults to the agent profile, which is what an external client asks for', async () => {
    expect(await fetchDocument('')).toEqual(
      await fetchDocument('?profile=agent'),
    );
  });

  it('never serves an operation no profile claims', async () => {
    for (const query of ['?profile=agent', '?profile=chat']) {
      const document = await fetchDocument(query);

      expect(document.paths['/v1/organizations/']).toBeUndefined();
    }
  });

  it('rejects a profile that does not exist rather than inventing one', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/mcp/openapi.json?profile=root',
    });

    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});
