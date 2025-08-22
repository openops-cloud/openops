import { Static, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { pack, unpack } from 'msgpackr';
import { promisify } from 'node:util';
import { brotliCompress, brotliDecompress, constants as zc } from 'node:zlib';
import { cacheWrapper } from './cache/cache-wrapper';
import { logger } from './logger';

const brCompress = promisify(brotliCompress);
const brDecompress = promisify(brotliDecompress);

const DEFAULT_EXPIRE_TIME = 300;
const COMPRESS_THRESHOLD = 8 * 1024; // 8 KiB
const COMPRESS_PREFIX = Buffer.from('br:');

const BROTLI_OPTS = {
  params: {
    [zc.BROTLI_PARAM_QUALITY]: 4, // Compression level from 0…11
  },
};

const isBodyAccessKeyRequest = (body: unknown): body is BodyAccessKeyRequest =>
  Value.Check(BodyAccessKeyRequest, body);

const isBrPrefixed = (buf: Buffer) =>
  buf.length >= COMPRESS_PREFIX.length &&
  buf.subarray(0, COMPRESS_PREFIX.length).equals(COMPRESS_PREFIX);

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
  const packed = pack(requestBody);
  const packedBuf = Buffer.isBuffer(packed) ? packed : Buffer.from(packed);

  if (packedBuf.length >= COMPRESS_THRESHOLD) {
    const compressed = await brCompress(packedBuf, BROTLI_OPTS);


    if (compressed.length < packedBuf.length) {
      await cacheWrapper.setBuffer(
        bodyAccessKey,
        Buffer.concat([COMPRESS_PREFIX, compressed]),
        DEFAULT_EXPIRE_TIME,
      );

      const duration = Math.floor(performance.now() - startTime);
      logger.debug(`Request body saved in ${duration}ms. Compression used.`);
      return bodyAccessKey;
    }
  }

  await cacheWrapper.setBuffer(bodyAccessKey, packedBuf, DEFAULT_EXPIRE_TIME);

  const duration = Math.floor(performance.now() - startTime);
  logger.debug(`Request body saved in ${duration}ms. No compression used.`);
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

  if (isBrPrefixed(request)) {
    const body = await brDecompress(request.subarray(COMPRESS_PREFIX.length));
    return unpack(body) as T;
  }

  const result = unpack(request);

  const duration = Math.floor(performance.now() - startTime);
  logger.debug(`Request body retrieved in ${duration}ms`);
  return result as T;
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
