export enum PrincipalType {
  USER = 'USER',
  ENGINE = 'ENGINE',
  SERVICE = 'SERVICE',
  WORKER = 'WORKER',
  UNKNOWN = 'UNKNOWN',

  /**
   * @deprecated
   */
  SUPER_USER = 'SUPER_USER',
}

export const ALL_PRINCIPAL_TYPES = [
  PrincipalType.USER,
  PrincipalType.ENGINE,
  PrincipalType.SERVICE,
  PrincipalType.WORKER,
  PrincipalType.SUPER_USER,
];

export const SERVICE_KEY_SECURITY_OPENAPI = {
  apiKey: [],
};

export enum EndpointScope {
  ORGANIZATION = 'ORGANIZATION',
  PROJECT = 'PROJECT',
}
