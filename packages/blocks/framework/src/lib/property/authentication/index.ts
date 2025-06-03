import { Type } from '@sinclair/typebox';
import { PropertyType } from '../input/property-type';
import { BasicAuthProperty } from './basic-auth-prop';
import { CustomAuthProperty, CustomAuthProps } from './custom-auth-prop';
import { OAuth2Property, OAuth2Props } from './oauth2-prop';
import { SecretProperty } from './secret-property';

export const BlockAuthProperty = Type.Union([
  BasicAuthProperty,
  CustomAuthProperty,
  OAuth2Property,
  SecretProperty,
]);

export type BlockAuthProperty =
  | BasicAuthProperty
  | CustomAuthProperty<any, boolean>
  | OAuth2Property<any>
  | SecretProperty<boolean>;

type AuthProperties<T> = Omit<Properties<T>, 'displayName'>;

type Properties<T> = Omit<
  T,
  'valueSchema' | 'type' | 'defaultValidators' | 'defaultProcessors'
>;

export const BlockAuth = {
  Secret<R extends boolean>(
    request: Properties<SecretProperty<R>>,
  ): R extends true ? SecretProperty<true> : SecretProperty<false> {
    return {
      ...request,
      valueSchema: undefined,
      type: PropertyType.SECRET_TEXT,
      required: true,
    } as unknown as R extends true
      ? SecretProperty<true>
      : SecretProperty<false>;
  },
  OAuth2<T extends OAuth2Props>(
    request: AuthProperties<OAuth2Property<T>>,
  ): OAuth2Property<T> {
    return {
      ...request,
      valueSchema: undefined,
      type: PropertyType.OAUTH2,
      displayName: 'Connection',
    } as unknown as OAuth2Property<T>;
  },
  BasicAuth(request: AuthProperties<BasicAuthProperty>): BasicAuthProperty {
    return {
      ...request,
      valueSchema: undefined,
      type: PropertyType.BASIC_AUTH,
      displayName: 'Connection',
      required: true,
    } as unknown as BasicAuthProperty;
  },
  CustomAuth<T extends CustomAuthProps, R extends boolean = true>(
    request: AuthProperties<CustomAuthProperty<T, R>>,
  ): CustomAuthProperty<T, R> {
    return {
      ...request,
      valueSchema: undefined,
      type: PropertyType.CUSTOM_AUTH,
      displayName: 'Connection',
    } as unknown as CustomAuthProperty<T, R>;
  },
  None() {
    return undefined;
  },
};
