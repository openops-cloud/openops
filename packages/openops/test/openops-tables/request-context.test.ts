const createAxiosHeadersMock = jest.fn();
const createAxiosHeadersForOpenOpsTablesBlockMock = jest.fn();
jest.mock('../../src/lib/openops-tables/requests-helpers', () => ({
  createAxiosHeaders: createAxiosHeadersMock,
  createAxiosHeadersForOpenOpsTablesBlock:
    createAxiosHeadersForOpenOpsTablesBlockMock,
}));

import { AxiosHeaders } from 'axios';
import {
  createDatabaseTokenRequestContext,
  createJwtRequestContext,
  createRequestContext,
} from '../../src/lib/openops-tables/request-context';

describe('request-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJwtRequestContext', () => {
    it('should create a request context for JWT authentication', () => {
      const token = 'jwt-token-123';
      const mockHeaders = new AxiosHeaders({
        Authorization: 'JWT jwt-token-123',
      });
      createAxiosHeadersMock.mockReturnValue(mockHeaders);

      const ctx = createJwtRequestContext(token);

      expect(ctx.token).toBe(token);
      expect(ctx.createHeaders).toBe(createAxiosHeadersMock);

      const headers = ctx.createHeaders(token);
      expect(headers).toBe(mockHeaders);
      expect(createAxiosHeadersMock).toHaveBeenCalledWith(token);
    });
  });

  describe('createDatabaseTokenRequestContext', () => {
    it('should create a request context for database token authentication', () => {
      const token = 'db-token-456';
      const mockHeaders = new AxiosHeaders({
        Authorization: 'Token db-token-456',
      });
      createAxiosHeadersForOpenOpsTablesBlockMock.mockReturnValue(mockHeaders);

      const ctx = createDatabaseTokenRequestContext(token);

      expect(ctx.token).toBe(token);
      expect(ctx.createHeaders).toBe(
        createAxiosHeadersForOpenOpsTablesBlockMock,
      );

      const headers = ctx.createHeaders(token);
      expect(headers).toBe(mockHeaders);
      expect(createAxiosHeadersForOpenOpsTablesBlockMock).toHaveBeenCalledWith(
        token,
      );
    });
  });

  describe('createRequestContext', () => {
    it('should create JWT request context when useJwt is true', () => {
      const token = 'jwt-token-789';
      const mockHeaders = new AxiosHeaders({
        Authorization: 'JWT jwt-token-789',
      });
      createAxiosHeadersMock.mockReturnValue(mockHeaders);

      const ctx = createRequestContext(token, true);

      expect(ctx.token).toBe(token);
      expect(ctx.createHeaders).toBe(createAxiosHeadersMock);
    });

    it('should create database token request context when useJwt is false', () => {
      const token = 'db-token-abc';
      const mockHeaders = new AxiosHeaders({
        Authorization: 'Token db-token-abc',
      });
      createAxiosHeadersForOpenOpsTablesBlockMock.mockReturnValue(mockHeaders);

      const ctx = createRequestContext(token, false);

      expect(ctx.token).toBe(token);
      expect(ctx.createHeaders).toBe(
        createAxiosHeadersForOpenOpsTablesBlockMock,
      );
    });
  });
});
