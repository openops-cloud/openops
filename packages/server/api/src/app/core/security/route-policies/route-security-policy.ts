import {
  AuthorizationScope,
  Permission,
  PrincipalType,
  PublicRoute,
  RouteAccessType,
} from '@openops/shared';
import { ProjectIdSource } from './project-id-source';

type AuthorizationPolicy =
  | OrganizationAuthorizationPolicy
  | ProjectAuthorizationPolicy;

export type AuthenticatedRoutePolicy = {
  routeAccessType: RouteAccessType.AUTHENTICATED;
  authorization: AuthorizationPolicy;
};

export type OrganizationAuthorizationPolicy = {
  authorizationScope: AuthorizationScope.ORGANIZATION;
  allowedPrincipals: readonly PrincipalType[];
  permission?: Permission;
};

export type ProjectAuthorizationPolicy = {
  authorizationScope: AuthorizationScope.PROJECT;
  allowedPrincipals: readonly PrincipalType[];
  projectIdSource: ProjectIdSource;
  permission?: Permission;
};

export type RouteSecurityPolicy = AuthenticatedRoutePolicy | PublicRoute;
