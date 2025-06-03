import { OAuth2GrantType } from '@openops/shared';
import { Type } from '@sinclair/typebox';
import { StaticPropsValue } from '..';
import { ValidationInputType } from '../../validators';
import { TPropertyValue } from '../input/common';
import { StaticDropdownProperty } from '../input/dropdown/static-dropdown';
import { PropertyType } from '../input/property-type';
import { SecretTextProperty } from '../input/secret-text-property';
import { ShortTextProperty } from '../input/text-property';
import { BaseBlockAuthSchema } from './common';

export enum OAuth2AuthorizationMethod {
  HEADER = 'HEADER',
  BODY = 'BODY',
}

const OAuthProp = Type.Union([
  ShortTextProperty,
  SecretTextProperty,
  StaticDropdownProperty,
]);

type OAuthProp =
  | ShortTextProperty<boolean>
  | SecretTextProperty<boolean>
  | StaticDropdownProperty<any, true>;

export const OAuth2Props = Type.Record(Type.String(), OAuthProp);

export type OAuth2Props = {
  [key: string]: OAuthProp;
};

type OAuthPropsValue<T extends OAuth2Props> = StaticPropsValue<T>;

const OAuth2ExtraProps = Type.Object({
  props: Type.Optional(Type.Record(Type.String(), OAuthProp)),
  authUrl: Type.String(),
  tokenUrl: Type.String(),
  scope: Type.Array(Type.String()),
  pkce: Type.Optional(Type.Boolean()),
  authorizationMethod: Type.Optional(Type.Enum(OAuth2AuthorizationMethod)),
  grantType: Type.Optional(Type.Enum(OAuth2GrantType)),
  extra: Type.Optional(Type.Record(Type.String(), Type.String())),
});

type OAuth2ExtraProps = {
  props?: OAuth2Props;
  authUrl: string;
  tokenUrl: string;
  scope: string[];
  pkce?: boolean;
  authorizationMethod?: OAuth2AuthorizationMethod;
  grantType?: OAuth2GrantType;
  extra?: Record<string, string>;
};

export const OAuth2PropertyValue = Type.Object({
  access_token: Type.String(),
  props: Type.Optional(OAuth2Props),
  data: Type.Record(Type.String(), Type.Any()),
});

export type OAuth2PropertyValue<T extends OAuth2Props = any> = {
  access_token: string;
  props?: OAuthPropsValue<T>;
  data: Record<string, any>;
};

export const OAuth2Property = Type.Composite([
  BaseBlockAuthSchema,
  OAuth2ExtraProps,
  TPropertyValue(OAuth2PropertyValue, PropertyType.OAUTH2),
]);

export type OAuth2Property<T extends OAuth2Props> =
  BaseBlockAuthSchema<OAuth2PropertyValue> &
    OAuth2ExtraProps &
    TPropertyValue<
      OAuth2PropertyValue<T>,
      PropertyType.OAUTH2,
      ValidationInputType.ANY,
      true
    >;
