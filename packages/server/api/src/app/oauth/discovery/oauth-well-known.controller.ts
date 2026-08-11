import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { PUBLIC_ROUTE_POLICY } from '@openops/shared';
import { signingKeyService } from '../tokens/signing-key.service';
import {
  buildAuthorizationServerMetadata,
  getWellKnownPathVariants,
} from './oauth-metadata';

const METADATA_CACHE_HEADER = 'public, max-age=300';

// The MCP authorization spec has clients look under both the RFC 8414 and OpenID Connect
// discovery paths, so the same document is served at both.
export const oauthWellKnownController: FastifyPluginAsyncTypebox = async (
  app,
) => {
  const metadataPaths = [
    ...getWellKnownPathVariants('/.well-known/oauth-authorization-server'),
    ...getWellKnownPathVariants('/.well-known/openid-configuration'),
  ];

  for (const path of metadataPaths) {
    app.get(
      path,
      {
        config: { security: PUBLIC_ROUTE_POLICY },
        schema: {
          description: 'OAuth 2.0 authorization server metadata (RFC 8414).',
        },
      },
      async (_request, reply) => {
        return reply
          .header('Cache-Control', METADATA_CACHE_HEADER)
          .send(buildAuthorizationServerMetadata());
      },
    );
  }

  app.get(
    '/v1/oauth/jwks.json',
    {
      config: { security: PUBLIC_ROUTE_POLICY },
      schema: {
        description:
          'Public keys for verifying OAuth-issued access tokens (RFC 7517).',
      },
    },
    async (_request, reply) => {
      const jwks = await signingKeyService.getJwks();

      return reply.header('Cache-Control', METADATA_CACHE_HEADER).send(jwks);
    },
  );
};
