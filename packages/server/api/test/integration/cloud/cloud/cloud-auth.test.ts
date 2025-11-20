import { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { getVerifiedUser } from '../../../../src/app/user-info/cloud-auth';

type MockFastifyRequest = FastifyRequest & {
  cookies: Record<string, string>;
};

function createMockRequest(options: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}): MockFastifyRequest {
  return {
    headers: options.headers || {},
    cookies: options.cookies || {},
    id: 'test-id',
    params: {},
    raw: {},
    query: {},
    body: null,
    server: {},
    log: {},
    url: '',
    method: 'GET',
    routerPath: '',
    routerMethod: 'GET',
    is404: false,
    routeOptions: {},
    context: {},
    socket: {},
    protocol: 'http',
    ip: '',
    ips: [],
    hostname: '',
    type: '',
    routeConfig: {},
  } as unknown as MockFastifyRequest;
}

describe('getVerifiedUser', () => {
  const publicKey = 'test-public-key';

  beforeEach(() => {
    jest.spyOn(jwt, 'verify').mockReset();
  });

  it('should return undefined when no token is present (no header, no cookie)', () => {
    const mockRequest = createMockRequest({ headers: {}, cookies: {} });

    const result = getVerifiedUser(mockRequest, publicKey);

    expect(result).toBeUndefined();
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('should verify token from Authorization header', () => {
    const payload = { sub: '123' };
    (jwt.verify as jest.Mock).mockReturnValue(payload);
    const mockRequest = createMockRequest({
      headers: { authorization: 'Bearer header-token' },
      cookies: {},
    });

    const result = getVerifiedUser(mockRequest, publicKey);

    expect(jwt.verify).toHaveBeenCalledWith('header-token', publicKey, {
      algorithms: ['RS256'],
    });
    expect(result).toEqual(payload);
  });

  it('should verify token from cookie when Authorization header is missing', () => {
    const payload = { sub: 'abc' };
    (jwt.verify as jest.Mock).mockReturnValue(payload);
    const mockRequest = createMockRequest({
      headers: {},
      cookies: { 'cloud-token': 'cookie-token' },
    });

    const result = getVerifiedUser(mockRequest, publicKey);

    expect(jwt.verify).toHaveBeenCalledWith('cookie-token', publicKey, {
      algorithms: ['RS256'],
    });
    expect(result).toEqual(payload);
  });

  it('should return undefined when verification fails (throws)', () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid');
    });
    const mockRequest = createMockRequest({
      headers: { authorization: 'Bearer bad-token' },
      cookies: {},
    });

    const result = getVerifiedUser(mockRequest, publicKey);

    expect(result).toBeUndefined();
    expect(jwt.verify).toHaveBeenCalledWith('bad-token', publicKey, {
      algorithms: ['RS256'],
    });
  });
});
