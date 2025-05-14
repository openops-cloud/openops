import { Static, Type } from '@sinclair/typebox';
import { AppConnectionType } from '../app-connection';
import { OAuth2AuthorizationMethod } from '../oauth2-authorization-method';

const commonAuthProps = {
  name: Type.String({}),
  blockName: Type.String({}),
  projectId: Type.String({}),
};

enum OAuth2GrantType {
  AUTHORIZATION_CODE = 'authorization_code',
  CLIENT_CREDENTIALS = 'client_credentials',
}

export const PatchCustomAuthRequest = Type.Object(
  {
    ...commonAuthProps,
    id: Type.String(),
    type: Type.Literal(AppConnectionType.CUSTOM_AUTH),
    value: Type.Object({
      type: Type.Literal(AppConnectionType.CUSTOM_AUTH),
      props: Type.Record(Type.String(), Type.Unknown()),
    }),
  },
  {
    title: 'Custom Auth',
    description: 'Custom Auth',
  },
);

const commonOAuth2ValueProps = {
  client_id: Type.String({
    minLength: 1,
  }),
  code: Type.String({
    minLength: 1,
  }),
  code_challenge: Type.Optional(Type.String({})),
  scope: Type.String(),
  authorization_method: Type.Optional(Type.Enum(OAuth2AuthorizationMethod)),
};
export const PatchPlatformOAuth2Request = Type.Object(
  {
    ...commonAuthProps,
    id: Type.String(),
    type: Type.Literal(AppConnectionType.PLATFORM_OAUTH2),
    value: Type.Object({
      ...commonOAuth2ValueProps,
      props: Type.Optional(Type.Record(Type.String(), Type.String())),
      type: Type.Literal(AppConnectionType.PLATFORM_OAUTH2),
      redirect_url: Type.String({
        minLength: 1,
      }),
    }),
  },
  {
    title: 'Platform OAuth2',
    description: 'Platform OAuth2',
  },
);

export const PatchCloudOAuth2Request = Type.Object(
  {
    ...commonAuthProps,
    id: Type.String(),
    type: Type.Literal(AppConnectionType.CLOUD_OAUTH2),
    value: Type.Object({
      ...commonOAuth2ValueProps,
      props: Type.Optional(Type.Record(Type.String(), Type.String())),
      scope: Type.String(),
      type: Type.Literal(AppConnectionType.CLOUD_OAUTH2),
    }),
  },
  {
    title: 'Cloud OAuth2',
    description: 'Cloud OAuth2',
  },
);

export const PatchSecretTextRequest = Type.Object(
  {
    ...commonAuthProps,
    id: Type.String(),
    type: Type.Literal(AppConnectionType.SECRET_TEXT),
    value: Type.Object({
      type: Type.Literal(AppConnectionType.SECRET_TEXT),
      secret_text: Type.String({
        minLength: 1,
      }),
    }),
  },
  {
    title: 'Secret Text',
    description: 'Secret Text',
  },
);

export const PatchOAuth2Request = Type.Object(
  {
    ...commonAuthProps,
    id: Type.String(),
    type: Type.Literal(AppConnectionType.OAUTH2),
    value: Type.Object({
      ...commonOAuth2ValueProps,
      client_secret: Type.String({
        minLength: 1,
      }),
      grant_type: Type.Optional(Type.Enum(OAuth2GrantType)),
      props: Type.Optional(Type.Record(Type.String(), Type.Any())),
      authorization_method: Type.Optional(Type.Enum(OAuth2AuthorizationMethod)),
      redirect_url: Type.String({
        minLength: 1,
      }),
      type: Type.Literal(AppConnectionType.OAUTH2),
    }),
  },
  {
    title: 'OAuth2',
    description: 'OAuth2',
  },
);

export const PatchBasicAuthRequest = Type.Object(
  {
    ...commonAuthProps,
    id: Type.String(),
    type: Type.Literal(AppConnectionType.BASIC_AUTH),
    value: Type.Object({
      username: Type.String({
        minLength: 1,
      }),
      password: Type.String({
        minLength: 1,
      }),
      type: Type.Literal(AppConnectionType.BASIC_AUTH),
    }),
  },
  {
    title: 'Basic Auth',
    description: 'Basic Auth',
  },
);

export const PatchAppConnectionRequestBody = Type.Union([
  PatchSecretTextRequest,
  PatchOAuth2Request,
  PatchCloudOAuth2Request,
  PatchPlatformOAuth2Request,
  PatchBasicAuthRequest,
  PatchCustomAuthRequest,
]);

export type PatchCloudOAuth2Request = Static<typeof PatchCloudOAuth2Request>;
export type PatchPlatformOAuth2Request = Static<
  typeof PatchPlatformOAuth2Request
>;
export type PatchOAuth2Request = Static<typeof PatchOAuth2Request>;
export type PatchSecretTextRequest = Static<typeof PatchSecretTextRequest>;
export type PatchBasicAuthRequest = Static<typeof PatchBasicAuthRequest>;
export type PatchCustomAuthRequest = Static<typeof PatchCustomAuthRequest>;
export type PatchAppConnectionRequestBody = Static<
  typeof PatchAppConnectionRequestBody
>;
