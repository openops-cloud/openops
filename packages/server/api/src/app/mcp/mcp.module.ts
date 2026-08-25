import '@fastify/swagger';
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { logger } from '@openops/server-shared';
import { findMissingOperations } from './mcp-document';
import { getMcpProfiles } from './mcp-profile-factory';
import { mcpController } from './mcp.controller';

export const mcpModule: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('onReady', async () => {
    for (const [name, profile] of Object.entries(getMcpProfiles())) {
      const missing = findMissingOperations(app.swagger(), profile);

      if (missing.length > 0) {
        logger.error('MCP profile names operations the API does not expose', {
          profile: name,
          missing,
        });
      }
    }
  });

  await app.register(mcpController, { prefix: '/v1/mcp' });
};
