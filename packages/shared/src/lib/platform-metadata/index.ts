import { Static, Type } from '@sinclair/typebox';

export const PlatformMetadata = Type.Object({
  version: Type.String(),
  tablesVersion: Type.String(),
  analyticsVersion: Type.String(),
  environment: Type.String(),
});

export type PlatformMetadata = Static<typeof PlatformMetadata>;

const UNKNOWN = 'UNKNOWN';
export const PLATFORM_METADATA_PLACEHOLDER = {
  app: UNKNOWN,
  tables: UNKNOWN,
  analytics: UNKNOWN,
  environment: UNKNOWN,
};
