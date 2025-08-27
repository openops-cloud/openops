import { FileCompression } from '@openops/shared';
import { Static, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { cacheWrapper } from './cache/cache-wrapper';
import { fileCompressor } from './file-compressor';
import { logger } from './logger';

const DEFAULT_EXPIRE_TIME = 300;

const isBodyAccessKeyRequest = (body: unknown): body is BodyAccessKeyRequest =>
  Value.Check(BodyAccessKeyRequest, body);

export const BodyAccessKeyRequest = Type.Object(
  {
    bodyAccessKey: Type.String(),
  },
  { additionalProperties: false },
);

export type BodyAccessKeyRequest = Static<typeof BodyAccessKeyRequest>;

export async function saveRequestBody(
  requestId: string,
  requestBody: unknown,
): Promise<string> {
  const startTime = performance.now();

  const bodyAccessKey = `req:${requestId}`;

  const compressedBuffer = await fileCompressor.compress({
    data: Buffer.from(JSON.stringify(requestBody)),
    compression: FileCompression.PACK_BROTLI,
  });

  try {
    await cacheWrapper.setBuffer(
      bodyAccessKey,
      compressedBuffer,
      DEFAULT_EXPIRE_TIME,
    );
  } catch (error) {
    logRedisError(error);
    throw error;
  }

  const duration = Math.floor(performance.now() - startTime);
  logger.debug(`Request body saved in ${duration}ms.`);
  return bodyAccessKey;
}

export async function getRequestBody<T>(bodyAccessKey: string): Promise<T> {
  const startTime = performance.now();
  const request = await cacheWrapper.getBufferAndDelete(bodyAccessKey);

  if (!request) {
    const message = `Failed to fetch request body from cache for key ${bodyAccessKey}`;
    logger.error(message);
    throw new Error(message);
  }

  const decompressBuffer = await fileCompressor.decompress({
    data: request,
    compression: FileCompression.PACK_BROTLI,
  });

  const duration = Math.floor(performance.now() - startTime);
  logger.debug(`Request body retrieved in ${duration}ms`);

  return JSON.parse(decompressBuffer.toString());
}

function logRedisError(error: unknown): void {
  if (
    error instanceof Error &&
    error.message.includes('OOM command not allowed when used memory')
  ) {
    logger.error(
      'Redis maximum memory reached while saving request body to cache.',
      {
        errorMessage: error.message,
      },
    );
    return;
  }

  logger.error('Error saving request body to cache.', error);
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
