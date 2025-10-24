import { Type } from '@sinclair/typebox';

export const BaseBlockAuthSchema = Type.Object({
  authProviderKey: Type.String(),
  authProviderDisplayName: Type.String(),
  authProviderLogoUrl: Type.String(),
  authProviderIcon: Type.Optional(Type.String()),
  displayName: Type.String(),
  description: Type.Optional(Type.String()),
});

export type BaseBlockAuthSchema<AuthValueSchema> = {
  authProviderKey: string;
  authProviderDisplayName: string;
  authProviderLogoUrl?: string;
  authProviderIcon?: string;
  displayName: string;
  description?: string;
  validate?: (params: {
    auth: AuthValueSchema;
  }) => Promise<{ valid: true } | { valid: false; error: string }>;
};
