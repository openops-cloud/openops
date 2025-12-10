import { FastifyRequest } from 'fastify';
import jwt, { JwtPayload } from 'jsonwebtoken';

const CLOUD_TOKEN_COOKIE_NAME = 'cloud-token';

const getCloudToken = (request: FastifyRequest): string | undefined => {
  const authorizationHeader = request.headers.authorization;
  const cookieToken = request.cookies[CLOUD_TOKEN_COOKIE_NAME];
  const headerToken = request.headers['ops-cloud-token'] as string | undefined;

  if (authorizationHeader) {
    return authorizationHeader.replace('Bearer ', '');
  }

  if (cookieToken) {
    return cookieToken;
  }

  return headerToken;
};

export function getVerifiedUser(
  request: FastifyRequest,
  publicKey: string,
): string | JwtPayload | undefined {
  const token = getCloudToken(request);
  if (!token) {
    return undefined;
  }

  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch {
    return undefined;
  }
}
