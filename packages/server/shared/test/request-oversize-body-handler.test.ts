import fastify from 'fastify';
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

jest.mock('../src/lib/file-compressor', () => {
  return {
    fileCompressor: {
      compress: jest.fn(),
      decompress: jest.fn(),
    },
  };
});

import { cacheWrapper } from '../src/lib/cache/cache-wrapper';
import { fileCompressor } from '../src/lib/file-compressor';
import { logger } from '../src/lib/logger';

describe('request-oversize-body-handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('saveRequestBody', () => {
    it('should save body into cache using compressor and return the key', async () => {
      const setSpy = jest.spyOn(cacheWrapper, 'setBuffer').mockResolvedValue();
      const fakeCompressed = Buffer.from('COMPRESSED:abc123');
      (fileCompressor.compress as jest.Mock).mockResolvedValue(fakeCompressed);

      const body = { hello: 'world' };
      const key = await saveRequestBody(body);

      expect(setSpy).toHaveBeenCalledTimes(1);
      const firstCall = setSpy.mock.calls[0];
      const calledKey = firstCall[0] as string;
      const calledBuffer = firstCall[1] as Buffer;
      const ttl = firstCall[2] as number;
      expect(calledKey).toBe(key);
      expect(calledBuffer).toBe(fakeCompressed);
      expect(ttl).toBe(300);
    });

    it('should invoke compressor for large payloads and store the result', async () => {
      const setSpy = jest.spyOn(cacheWrapper, 'setBuffer').mockResolvedValue();
      const fakeCompressed = Buffer.from('COMPRESSED:big');
      (fileCompressor.compress as jest.Mock).mockResolvedValue(fakeCompressed);
      const bigStr = 'a'.repeat(50_000);
      const body = { data: bigStr };

      await saveRequestBody(body);

      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(setSpy.mock.calls[0][1]).toBe(fakeCompressed);
    });
  });

  describe('getRequestBody', () => {
    it('should return body from cache when present (using compressor)', async () => {
      const body = { a: 1 };
      const cachedBuf = Buffer.from('CACHED:abc');
      jest
        .spyOn(cacheWrapper, 'getBufferAndDelete')
        .mockResolvedValue(cachedBuf);
      (fileCompressor.decompress as jest.Mock).mockResolvedValue(
        Buffer.from(JSON.stringify(body)),
      );
      const result = await getRequestBody<typeof body>('req:abc');
      expect(result).toEqual(body);
      expect(fileCompressor.decompress).toHaveBeenCalled();
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
      const fakeCache = Buffer.from('CACHED:body');
      jest
        .spyOn(cacheWrapper, 'getBufferAndDelete')
        .mockResolvedValue(fakeCache);
      (fileCompressor.decompress as jest.Mock).mockResolvedValue(
        Buffer.from(JSON.stringify(cached)),
      );

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
