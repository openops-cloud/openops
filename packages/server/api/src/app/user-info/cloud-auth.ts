import { FastifyRequest } from 'fastify';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { logger } from '@openops/server-shared';

const CLOUD_TOKEN_COOKIE_NAME = 'cloud-token';

const getCloudToken = (request: FastifyRequest): string | undefined => {
  const authorizationHeader = request.headers.authorization;
  const cookieToken = request.cookies[CLOUD_TOKEN_COOKIE_NAME];
  const headerToken = request.headers[CLOUD_TOKEN_COOKIE_NAME] as
    | string
    | undefined;

  if (authorizationHeader) {
    logger.info(`Authorization Header`);

    return authorizationHeader.replace('Bearer ', '');
  }

  if (cookieToken) {
    logger.info(`Authorization Cookie`);

    return cookieToken;
  }

  logger.info(`Authorization Cookie Header`, headerToken);
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
