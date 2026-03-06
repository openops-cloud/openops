export enum PropertyLocation {
  PARAMS = 'PARAMS',
  TOKEN = 'TOKEN',
  QUERY = 'QUERY',
  BODY = 'BODY',
}

type BasePropertySource = {
  key: string;
};

export type ParamsPropertySource = BasePropertySource & {
  location: PropertyLocation.PARAMS;
};

export type TokenPropertySource = {
  location: PropertyLocation.TOKEN;
};

export type QueryPropertySource = BasePropertySource & {
  location: PropertyLocation.QUERY;
};

export type BodyPropertySource = BasePropertySource & {
  location: PropertyLocation.BODY;
};

export type PropertySource =
  | TokenPropertySource
  | QueryPropertySource
  | BodyPropertySource
  | ParamsPropertySource;
