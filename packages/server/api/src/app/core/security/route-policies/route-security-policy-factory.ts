import {
  AuthorizationScope,
  Permission,
  PrincipalType,
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

export function getProjectScopedRoutePolicy({
  projectIdSource = defaultProjectIdSource,
  allowedPrincipals,
  permission,
}: {
  allowedPrincipals: readonly PrincipalType[];
  projectIdSource?: ProjectIdSource;
  permission?: Permission;
}): AuthenticatedRoutePolicy {
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
