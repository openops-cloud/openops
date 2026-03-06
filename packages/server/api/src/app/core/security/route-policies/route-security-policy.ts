import {
  AuthorizationScope,
  Permission,
  PrincipalType,
  PublicRoutePolicy,
  RouteAccessType,
  UnscopedAuthorizationPolicy,
} from '@openops/shared';
import { PropertySource } from './property-source';

type AuthorizationPolicy =
  | OrganizationAuthorizationPolicy
  | ProjectAuthorizationPolicy
  | UnscopedAuthorizationPolicy;

export type AuthenticatedRoutePolicy = {
  routeAccessType: RouteAccessType.AUTHENTICATED;
  authorization: AuthorizationPolicy;
};

export type OrganizationAuthorizationPolicy = {
  authorizationScope: AuthorizationScope.ORGANIZATION;
  allowedPrincipals: readonly PrincipalType[];
  organizationIdSource: PropertySource;
  permission?: Permission;
};

export type ProjectAuthorizationPolicy = {
  authorizationScope: AuthorizationScope.PROJECT;
  allowedPrincipals: readonly PrincipalType[];
  projectIdSource: PropertySource;
  permission?: Permission;
};

export type UnscopedAuthorizationPolicy = {
  authorizationScope: AuthorizationScope.UNSCOPED;
  allowedPrincipals: readonly PrincipalType[];
};

export type RouteSecurityPolicy = AuthenticatedRoutePolicy | PublicRoutePolicy;
