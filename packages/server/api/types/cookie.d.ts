declare module 'cookie' {
  export interface CookieParseOptions {
    decode?(value: string): string;
  }

  export interface CookieSerializeOptions {
    encode?(value: string): string;
    domain?: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: true | false | 'lax' | 'strict' | 'none';
    partitioned?: boolean;
    priority?: 'low' | 'medium' | 'high';
  }

  export function parse(
    str: string,
    options?: CookieParseOptions,
  ): Record<string, string>;

  export function serialize(
    name: string,
    value: string,
    options?: CookieSerializeOptions,
  ): string;

  const cookie: {
    parse: typeof parse;
    serialize: typeof serialize;
  };

  export default cookie;
}
