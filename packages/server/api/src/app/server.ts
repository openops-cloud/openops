import formBody from '@fastify/formbody';
import fastifyMultipart from '@fastify/multipart';
import { logger, system } from '@openops/server-shared';
import { openOpsId } from '@openops/shared';
import fastify, { FastifyInstance } from 'fastify';
import fastifyFavicon from 'fastify-favicon';
import { fastifyRawBody } from 'fastify-raw-body';
import qs from 'qs';
import { setupApp } from './app';
import { healthModule } from './health/health.module';
import { errorHandler } from './helper/error-handler';
import { metaModule } from './meta/meta.module';
import { setupWorker } from './worker';

export const setupServer = async (): Promise<FastifyInstance> => {
  const app = await setupBaseApp();

  if (system.isApp()) {
    await setupApp(app);
  }
  if (system.isWorker()) {
    await setupWorker(app);
  }
  return app;
};

async function setupBaseApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger,
    pluginTimeout: 30000,
    bodyLimit: 6 * 1024 * 1024, // 6MB same as engine api-handler & nginx.conf
    genReqId: () => {
      return `req_${openOpsId()}`;
    },
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        useDefaults: true,
        coerceTypes: 'array',
        formats: {},
      },
    },
  });

  await app.register(fastifyFavicon);
  await app.register(fastifyMultipart, {
    attachFieldsToBody: 'keyValues',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async onFile(part: any) {
      const buffer = await part.toBuffer();
      part.value = buffer;
    },
  });

  await app.register(fastifyRawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
    routes: [],
  });

  await app.register(formBody, { parser: (str) => qs.parse(str) });
  app.setErrorHandler(errorHandler);
  await app.register(healthModule);
  await app.register(metaModule);

  return app;
}
