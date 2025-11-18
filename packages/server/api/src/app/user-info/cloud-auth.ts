import { FastifyRequest } from 'fastify';
import jwt, { JwtPayload } from 'jsonwebtoken';

const CLOUD_TOKEN_COOKIE_NAME = 'cloud-token';

const getCloudToken = (request: FastifyRequest): string | undefined => {
  let token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    token = request.cookies[CLOUD_TOKEN_COOKIE_NAME];
  }
  return token;
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
