import { Type } from '@sinclair/typebox';

export const BaseBlockAuthSchema = Type.Object({
  authProviderKey: Type.String(),
  authProviderDisplayName: Type.String(),
  authProviderLogoUrl: Type.Optional(Type.String()),
  authProviderDisplayIcon: Type.Optional(Type.String()),
  displayName: Type.String(),
  description: Type.Optional(Type.String()),
});

export type BaseBlockAuthSchema<AuthValueSchema> = {
  authProviderKey: string;
  authProviderDisplayName: string;
  authProviderLogoUrl?: string;
  authProviderDisplayIcon?: string;
  displayName: string;
  description?: string;
  validate?: (params: {
    auth: AuthValueSchema;
  }) => Promise<{ valid: true } | { valid: false; error: string }>;
};
