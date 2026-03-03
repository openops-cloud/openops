export enum ProjectIdLocation {
  PARAMS = 'PARAMS',
  TOKEN = 'TOKEN',
  QUERY = 'QUERY',
  BODY = 'BODY',
}

type BaseProjectIdSource = {
  key?: string;
};

export type ParamsProjectIdSource = BaseProjectIdSource & {
  location: ProjectIdLocation.PARAMS;
};

export type TokenProjectIdSource = {
  location: ProjectIdLocation.TOKEN;
};

export type QueryProjectIdSource = BaseProjectIdSource & {
  location: ProjectIdLocation.QUERY;
};

export type BodyProjectIdSource = BaseProjectIdSource & {
  location: ProjectIdLocation.BODY;
};

export type ProjectIdSource =
  | TokenProjectIdSource
  | QueryProjectIdSource
  | BodyProjectIdSource
  | ParamsProjectIdSource;
