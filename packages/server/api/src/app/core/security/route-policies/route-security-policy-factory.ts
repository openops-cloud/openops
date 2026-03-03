import {
  AuthorizationScope,
  Permission,
  PrincipalType,
  PublicRoute,
  RouteAccessType,
} from '@openops/shared';
import { ProjectIdLocation, ProjectIdSource } from './project-id-source';
import { AuthenticatedRoutePolicy } from './route-security-policy';

const defaultProjectIdSource: ProjectIdSource = {
  location: ProjectIdLocation.TOKEN,
};

export function getOrganizationScopedRoutePolicy(
  allowedPrincipals: readonly PrincipalType[],
): AuthenticatedRoutePolicy {
  return {
    routeAccessType: RouteAccessType.AUTHENTICATED,
    authorization: {
      authorizationScope: AuthorizationScope.ORGANIZATION,
      allowedPrincipals,
    },
  };
}

export function getProjectScopedRoutePolicy(
  allowedPrincipals: readonly PrincipalType[],
  permission?: Permission,
  projectIdSource: ProjectIdSource = defaultProjectIdSource,
): AuthenticatedRoutePolicy {
  return {
    routeAccessType: RouteAccessType.AUTHENTICATED,
    authorization: {
      authorizationScope: AuthorizationScope.PROJECT,
      allowedPrincipals,
      projectIdSource,
      permission,
    },
  };
}

export function getPublicRoutePolicy(): PublicRoute {
  return {
    routeAccessType: RouteAccessType.PUBLIC,
  };
}
