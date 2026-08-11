import { EntitySchema } from 'typeorm';
import {
  BaseColumnSchemaPart,
  JSONB_COLUMN_TYPE,
  OpenOpsIdSchema,
  TIMESTAMP_COLUMN_TYPE,
} from '../../database/database-common';
import {
  OAuthAuthorizationCode,
  OAuthClient,
  OAuthGrant,
  OAuthPendingAuthorization,
  OAuthRefreshToken,
  OAuthSigningKey,
} from './oauth-model';

const SHA256_HEX_LENGTH = 64;
const URI_LENGTH = 512;
const CODE_CHALLENGE_LENGTH = 43;

export const OAuthSigningKeyEntity = new EntitySchema<OAuthSigningKey>({
  name: 'oauth_signing_key',
  columns: {
    ...BaseColumnSchemaPart,
    privateKeyEncrypted: { type: String },
    publicKeyPem: { type: String },
    status: { type: String, length: 16 },
  },
  // Partial unique index, mirroring the migration: what makes concurrently booting
  // replicas converge on one active key.
  indices: [
    {
      name: 'idx_oauth_signing_key_single_active',
      columns: ['status'],
      unique: true,
      where: '"status" = \'active\'',
    },
  ],
});

export const OAuthClientEntity = new EntitySchema<OAuthClient>({
  name: 'oauth_client',
  columns: {
    ...BaseColumnSchemaPart,
    clientName: { type: String, length: 128 },
    redirectUris: { type: JSONB_COLUMN_TYPE },
    grantTypes: { type: JSONB_COLUMN_TYPE },
    tokenEndpointAuthMethod: { type: String, length: 32 },
    clientSecretHash: {
      type: String,
      length: SHA256_HEX_LENGTH,
      nullable: true,
    },
  },
  indices: [],
});

export const OAuthPendingAuthorizationEntity =
  new EntitySchema<OAuthPendingAuthorization>({
    name: 'oauth_pending_authorization',
    columns: {
      ...BaseColumnSchemaPart,
      clientId: { ...OpenOpsIdSchema },
      redirectUri: { type: String, length: URI_LENGTH },
      codeChallenge: { type: String, length: CODE_CHALLENGE_LENGTH },
      resource: { type: String, length: URI_LENGTH },
      scope: { type: String, length: 128 },
      state: { type: String, nullable: true },
      expiresAt: { type: TIMESTAMP_COLUMN_TYPE },
      consumedAt: { type: TIMESTAMP_COLUMN_TYPE, nullable: true },
    },
    indices: [
      {
        name: 'idx_oauth_pending_authorization_expires_at',
        columns: ['expiresAt'],
      },
    ],
  });

export const OAuthAuthorizationCodeEntity =
  new EntitySchema<OAuthAuthorizationCode>({
    name: 'oauth_authorization_code',
    columns: {
      ...BaseColumnSchemaPart,
      codeHash: { type: String, length: SHA256_HEX_LENGTH },
      clientId: { ...OpenOpsIdSchema },
      userId: { ...OpenOpsIdSchema },
      redirectUri: { type: String, length: URI_LENGTH },
      codeChallenge: { type: String, length: CODE_CHALLENGE_LENGTH },
      resource: { type: String, length: URI_LENGTH },
      scope: { type: String, length: 128 },
      expiresAt: { type: TIMESTAMP_COLUMN_TYPE },
      consumedAt: { type: TIMESTAMP_COLUMN_TYPE, nullable: true },
    },
    indices: [
      {
        name: 'idx_oauth_authorization_code_code_hash',
        columns: ['codeHash'],
        unique: true,
      },
      {
        name: 'idx_oauth_authorization_code_expires_at',
        columns: ['expiresAt'],
      },
    ],
  });

export const OAuthRefreshTokenEntity = new EntitySchema<OAuthRefreshToken>({
  name: 'oauth_refresh_token',
  columns: {
    ...BaseColumnSchemaPart,
    tokenHash: { type: String, length: SHA256_HEX_LENGTH },
    grantId: { ...OpenOpsIdSchema },
    familyId: { ...OpenOpsIdSchema },
    clientId: { ...OpenOpsIdSchema },
    resource: { type: String, length: URI_LENGTH },
    scope: { type: String, length: 128 },
    projectId: { ...OpenOpsIdSchema },
    expiresAt: { type: TIMESTAMP_COLUMN_TYPE },
    revokedAt: { type: TIMESTAMP_COLUMN_TYPE, nullable: true },
  },
  indices: [
    {
      name: 'idx_oauth_refresh_token_token_hash',
      columns: ['tokenHash'],
      unique: true,
    },
    { name: 'idx_oauth_refresh_token_grant_id', columns: ['grantId'] },
    { name: 'idx_oauth_refresh_token_family_id', columns: ['familyId'] },
    { name: 'idx_oauth_refresh_token_expires_at', columns: ['expiresAt'] },
  ],
});

export const OAuthGrantEntity = new EntitySchema<OAuthGrant>({
  name: 'oauth_grant',
  columns: {
    ...BaseColumnSchemaPart,
    clientId: { ...OpenOpsIdSchema },
    userId: { ...OpenOpsIdSchema },
    resourceId: { type: String, length: 32 },
    status: { type: String, length: 16 },
    lastUsedAt: { type: TIMESTAMP_COLUMN_TYPE, nullable: true },
    revokedAt: { type: TIMESTAMP_COLUMN_TYPE, nullable: true },
  },
  // Not unique on (clientId, userId): a user may connect the same agent more than once.
  indices: [
    {
      name: 'idx_oauth_grant_client_id_user_id',
      columns: ['clientId', 'userId'],
    },
    { name: 'idx_oauth_grant_user_id', columns: ['userId'] },
  ],
});
