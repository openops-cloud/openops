import { Static, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { cacheWrapper } from './cache/cache-wrapper';
import { logger } from './logger';

export const BodyAccessKeyRequest = Type.Object(
  {
    bodyAccessKey: Type.String(),
  },
  { additionalProperties: false },
);

export type BodyAccessKeyRequest = Static<typeof BodyAccessKeyRequest>;

const isBodyAccessKeyRequest = (body: unknown): body is BodyAccessKeyRequest =>
  Value.Check(BodyAccessKeyRequest, body);

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
    if (!isBodyAccessKeyRequest(request.body)) {
      return;
    }

    const resourceKey = (request.body as { bodyAccessKey: string })
      .bodyAccessKey;

    request.body = await getRequestBody(resourceKey);
  });
};

export const bodyConverterModule = fp(bodyConverterModuleBase, {
  name: 'body-converter',
});
