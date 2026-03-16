// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Permission, Principal, PrincipalType } from '@openops/shared';
import fastify from 'fastify';
import { RouteSecurityPolicy } from '../src/app/core/security/route-policies/route-security-policy';
// eslint-disable-next-line @typescript-eslint/no-unused-vars

declare module 'fastify' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  export interface FastifyRequest {
    principal: Principal;
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  export interface FastifyInstance {
    io: Server<{ hello: string }>;
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  export interface FastifyContextConfig {
    rawBody?: boolean;
    security: RouteSecurityPolicy;

    // TODO: Prepare deprecation of the following properties
    allowedPrincipals?: PrincipalType[];
    permission?: Permission;
    skipAuth?: boolean;
  }
}
