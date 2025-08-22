import fastify from 'fastify';
import { pack, unpack } from 'msgpackr';
import {
  bodyConverterModule,
  getRequestBody,
  saveRequestBody,
} from '../src/lib/request-oversize-body-handler';

jest.mock('../src/lib/cache/cache-wrapper', () => {
  return {
    cacheWrapper: {
      setBuffer: jest.fn(),
      getBufferAndDelete: jest.fn(),
    },
  };
});

jest.mock('../src/lib/logger', () => {
  return {
    logger: {
      error: jest.fn(),
      debug: jest.fn(),
    },
  };
});

import { cacheWrapper } from '../src/lib/cache/cache-wrapper';
import { logger } from '../src/lib/logger';

describe('request-oversize-body-handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('saveRequestBody', () => {
    it('should save body into cache and return the key (no compression for small payload)', async () => {
      const setSpy = jest.spyOn(cacheWrapper, 'setBuffer').mockResolvedValue();

      const body = { hello: 'world' };
      const key = await saveRequestBody('abc123', body);

      expect(key).toBe('req:abc123');
      expect(setSpy).toHaveBeenCalledTimes(1);
      const firstCall = setSpy.mock.calls[0];
      const calledKey = firstCall[0] as string;
      const calledBuffer = firstCall[1] as Buffer;
      const ttl = firstCall[2] as number;
      expect(calledKey).toBe('req:abc123');
      expect(Buffer.isBuffer(calledBuffer)).toBe(true);
      expect(unpack(calledBuffer)).toEqual(body);
      expect(ttl).toBe(300);
    });

    it('should compress and store with br: prefix when payload is large and compressible', async () => {
      const setSpy = jest.spyOn(cacheWrapper, 'setBuffer').mockResolvedValue();
      const bigStr = 'a'.repeat(50_000);
      const body = { data: bigStr };

      const key = await saveRequestBody('big1', body);
      expect(key).toBe('req:big1');

      const firstCall2 = setSpy.mock.calls[0];
      const calledBuffer = firstCall2[1] as Buffer;
      const prefix = Buffer.from('br:');
      expect(calledBuffer.subarray(0, prefix.length).equals(prefix)).toBe(true);
    });
  });

  describe('getRequestBody', () => {
    it('should return body from cache when present (raw packed buffer)', async () => {
      const body = { a: 1 };
      const buf = pack(body);
      jest.spyOn(cacheWrapper, 'getBufferAndDelete').mockResolvedValue(buf);
      const result = await getRequestBody<typeof body>('req:abc');
      expect(result).toEqual(body);
    });

    it('should return body from cache when present (brotli-compressed buffer)', async () => {
      const body = { a: 2 };
      const packed = pack(body);
      const zlib = await import('node:zlib');
      const { promisify } = await import('node:util');
      const brCompress = promisify(zlib.brotliCompress);
      const compressed = await brCompress(packed, {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
      });
      const buf = Buffer.concat([Buffer.from('br:'), compressed]);
      jest.spyOn(cacheWrapper, 'getBufferAndDelete').mockResolvedValue(buf);
      const result = await getRequestBody<typeof body>('req:def');
      expect(result).toEqual(body);
    });

    it('should log error and throw when body not found', async () => {
      jest
        .spyOn(cacheWrapper, 'getBufferAndDelete')
        .mockResolvedValue(null as never);

      await expect(getRequestBody('req:missing')).rejects.toThrow(
        'Failed to fetch request body from cache for key req:missing',
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch request body from cache for key req:missing',
      );
    });
  });

  describe('bodyConverterModule', () => {
    it('should replace request.body when bodyAccessKey is provided', async () => {
      const cached = { foo: 'bar', nested: { x: 1 } };
      const buf = pack(cached);
      jest.spyOn(cacheWrapper, 'getBufferAndDelete').mockResolvedValue(buf);

      const app = fastify();
      await app.register(bodyConverterModule);
      app.post('/echo', async (req, reply) => {
        return req.body;
      });

      const res = await app.inject({
        method: 'POST',
        url: '/echo',
        payload: { bodyAccessKey: 'req:key-1' },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual(cached);
      await app.close();
    });

    it('should leave body intact when bodyAccessKey is not present', async () => {
      const app = fastify();
      await app.register(bodyConverterModule);
      app.post('/echo', async (req, reply) => {
        return req.body;
      });

      const original = { hello: 'there' };
      const res = await app.inject({
        method: 'POST',
        url: '/echo',
        payload: original,
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual(original);
      await app.close();
    });
  });
});
