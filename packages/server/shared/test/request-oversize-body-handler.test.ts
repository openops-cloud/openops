import fastify from 'fastify';
import {
  bodyConverterModule,
  getRequestBody,
  saveRequestBody,
} from '../src/lib/request-oversize-body-handler';

jest.mock('../src/lib/cache/cache-wrapper', () => {
  return {
    cacheWrapper: {
      setSerializedObject: jest.fn(),
      getSerializedObject: jest.fn(),
    },
  };
});

jest.mock('../src/lib/logger', () => {
  return {
    logger: {
      error: jest.fn(),
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
    it('should save body into cache and return the key', async () => {
      const setSpy = jest
        .spyOn(cacheWrapper, 'setSerializedObject')
        .mockResolvedValue();

      const key = await saveRequestBody('abc123', { hello: 'world' });

      expect(key).toBe('request:abc123');
      expect(setSpy).toHaveBeenCalledWith('request:abc123', { hello: 'world' });
    });
  });

  describe('getRequestBody', () => {
    it('should return body from cache when present', async () => {
      const body = { a: 1 };
      jest.spyOn(cacheWrapper, 'getSerializedObject').mockResolvedValue(body);
      const result = await getRequestBody<typeof body>('request:abc');
      expect(result).toEqual(body);
    });

    it('should log error and throw when body not found', async () => {
      jest
        .spyOn(cacheWrapper, 'getSerializedObject')
        .mockResolvedValue(null as never);

      await expect(getRequestBody('request:missing')).rejects.toThrow(
        'Failed to fetch request body from cache for key request:missing',
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch request body from cache for key request:missing',
      );
    });
  });

  describe('bodyConverterModule', () => {
    it('should replace request.body when bodyAccessKey is provided', async () => {
      const cached = { foo: 'bar', nested: { x: 1 } };
      jest.spyOn(cacheWrapper, 'getSerializedObject').mockResolvedValue(cached);

      const app = fastify();
      await app.register(bodyConverterModule);
      app.post('/echo', async (req, reply) => {
        return req.body;
      });

      const res = await app.inject({
        method: 'POST',
        url: '/echo',
        payload: { bodyAccessKey: 'request:key-1' },
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
