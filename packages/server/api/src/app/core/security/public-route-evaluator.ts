import { RouteAccessType } from '@openops/shared';
import { FastifyRequest } from 'fastify';

export function isPublicRoute(request: FastifyRequest): boolean {
  return (
    request.routeOptions.config?.security?.routeAccessType ===
    RouteAccessType.PUBLIC
  );
}
