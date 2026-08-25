// Module augmentation for `app.swagger()`; not reliable transitively.
import '@fastify/swagger';
import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { PUBLIC_ROUTE_POLICY } from '@openops/shared';
import { buildMcpDocument } from './mcp-document';
import { McpProfileName } from './mcp-profile';
import { getMcpProfiles } from './mcp-profile-factory';

const DOCUMENT_CACHE_HEADER = 'public, max-age=300';

const DEFAULT_PROFILE: McpProfileName = 'agent';

const McpDocumentRequest = {
  config: {
    // The MCP server holds no credential at startup, and this exposes shape, not data.
    security: PUBLIC_ROUTE_POLICY,
  },
  schema: {
    description:
      'The OpenAPI document for one MCP profile: the operations that profile exposes as tools, plus an x-openops-mcp block declaring whether agents on it may act in more than one project.',
    querystring: Type.Object({
      profile: Type.Optional(
        Type.Union([Type.Literal('chat'), Type.Literal('agent')], {
          description:
            'chat: the built-in AI chat surface. agent: external OAuth clients.',
        }),
      ),
    }),
  },
};

export const mcpController: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/openapi.json', McpDocumentRequest, async (request, reply) => {
    const profile = getMcpProfiles()[request.query.profile ?? DEFAULT_PROFILE];

    return reply
      .header('Cache-Control', DOCUMENT_CACHE_HEADER)
      .send(buildMcpDocument(app.swagger(), profile));
  });
};
