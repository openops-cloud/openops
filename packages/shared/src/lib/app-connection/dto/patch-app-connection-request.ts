import { Static, Type } from '@sinclair/typebox';
import {
  UpsertBasicAuthRequest,
  UpsertCloudOAuth2Request,
  UpsertCustomAuthRequest,
  UpsertOAuth2Request,
  UpsertPlatformOAuth2Request,
  UpsertSecretTextRequest,
} from './upsert-app-connection-request';

export const PatchSecretTextRequest = Type.Intersect([
  Type.Object({ id: Type.String() }),
  UpsertSecretTextRequest,
]);

export const PatchOAuth2Request = Type.Intersect([
  Type.Object({ id: Type.String() }),
  UpsertOAuth2Request,
]);

export const PatchCloudOAuth2Request = Type.Intersect([
  Type.Object({ id: Type.String() }),
  UpsertCloudOAuth2Request,
]);

export const PatchPlatformOAuth2Request = Type.Intersect([
  Type.Object({ id: Type.String() }),
  UpsertPlatformOAuth2Request,
]);

export const PatchBasicAuthRequest = Type.Intersect([
  Type.Object({ id: Type.String() }),
  UpsertBasicAuthRequest,
]);

export const PatchCustomAuthRequest = Type.Intersect([
  Type.Object({ id: Type.String() }),
  UpsertCustomAuthRequest,
]);

export const PatchAppConnectionRequestBody = Type.Union([
  PatchSecretTextRequest,
  PatchOAuth2Request,
  PatchCloudOAuth2Request,
  PatchPlatformOAuth2Request,
  PatchBasicAuthRequest,
  PatchCustomAuthRequest,
]);

export type PatchSecretTextRequest = Static<typeof PatchSecretTextRequest>;
export type PatchOAuth2Request = Static<typeof PatchOAuth2Request>;
export type PatchCloudOAuth2Request = Static<typeof PatchCloudOAuth2Request>;
export type PatchPlatformOAuth2Request = Static<
  typeof PatchPlatformOAuth2Request
>;
export type PatchBasicAuthRequest = Static<typeof PatchBasicAuthRequest>;
export type PatchCustomAuthRequest = Static<typeof PatchCustomAuthRequest>;
export type PatchAppConnectionRequestBody = Static<
  typeof PatchAppConnectionRequestBody
>;
