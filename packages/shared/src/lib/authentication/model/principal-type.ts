export enum PrincipalType {
  USER = 'USER',
  ENGINE = 'ENGINE',
  SERVICE = 'SERVICE',
  WORKER = 'WORKER',
  UNKNOWN = 'UNKNOWN',
}

export const ALL_PRINCIPAL_TYPES = Object.values(PrincipalType).filter(
  (type) => type !== PrincipalType.UNKNOWN,
);

export const SERVICE_KEY_SECURITY_OPENAPI = {
  apiKey: [],
};

export enum AuthorizationScope {
  ORGANIZATION = 'ORGANIZATION',
  PROJECT = 'PROJECT',
}

export enum RouteAccessType {
  AUTHENTICATED = 'AUTHENTICATED',
  PUBLIC = 'PUBLIC',
}

export type PublicRoute = {
  routeAccessType: RouteAccessType.PUBLIC;
};
