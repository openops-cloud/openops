import { Static, TSchema, Type } from '@sinclair/typebox';
import {
  UpsertBasicAuthRequest,
  UpsertCloudOAuth2Request,
  UpsertCustomAuthRequest,
  UpsertOAuth2Request,
  UpsertPlatformOAuth2Request,
  UpsertSecretTextRequest,
} from './upsert-app-connection-request';

function createPatchSchema<T extends TSchema>(upsertSchema: T) {
  return Type.Object(
    {
      id: Type.String(),
      ...upsertSchema['properties'],
    },
    {
      ...upsertSchema['options'],
      title: `Patch ${upsertSchema['options']?.title ?? 'Request'}`,
      description: `Patch ${upsertSchema['options']?.description ?? ''}`,
    },
  );
}

export const PatchSecretTextRequest = createPatchSchema(
  UpsertSecretTextRequest,
);
export const PatchOAuth2Request = createPatchSchema(UpsertOAuth2Request);
export const PatchCloudOAuth2Request = createPatchSchema(
  UpsertCloudOAuth2Request,
);
export const PatchPlatformOAuth2Request = createPatchSchema(
  UpsertPlatformOAuth2Request,
);
export const PatchBasicAuthRequest = createPatchSchema(UpsertBasicAuthRequest);
export const PatchCustomAuthRequest = createPatchSchema(
  UpsertCustomAuthRequest,
);

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
