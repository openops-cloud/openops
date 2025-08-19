import { Static, Type } from '@sinclair/typebox';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { cacheWrapper } from './cache/cache-wrapper';
import { logger } from './logger';

export const BodyAccessKeyRequest = Type.Object({
  bodyAccessKey: Type.String(),
});

export type BodyAccessKeyRequest = Static<typeof BodyAccessKeyRequest>;

export async function saveRequestBody(
  requestId: string,
  requestBody: unknown,
): Promise<string> {
  const bodyAccessKey = `request:${requestId}`;

  await cacheWrapper.setSerializedObject(bodyAccessKey, requestBody);

  return bodyAccessKey;
}

export async function getRequestBody<T>(bodyAccessKey: string): Promise<T> {
  const request = await cacheWrapper.getSerializedObject<T>(bodyAccessKey);

  if (!request) {
    const message = `Failed to fetch request body from cache for key ${bodyAccessKey}`;
    logger.error(message);
    throw new Error(message);
  }

  return request;
}

const bodyConverterModuleBase: FastifyPluginAsync = async (app) => {
  app.addHook('preValidation', async (request, reply) => {
    if (
      request.body &&
      typeof request.body === 'object' &&
      'bodyAccessKey' in request.body
    ) {
      const resourceKey = (request.body as { bodyAccessKey: string })
        .bodyAccessKey;

      request.body = await getRequestBody(resourceKey);
    }
  });
};

export const bodyConverterModule = fp(bodyConverterModuleBase, {
  name: 'body-converter',
});
