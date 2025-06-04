import { ConnectionProvider, ConnectionProviderSchema } from '@openops/shared';
import { Type } from '@sinclair/typebox';

export const BaseBlockAuthSchema = Type.Object({
  provider: ConnectionProviderSchema,
  displayName: Type.String(),
  description: Type.Optional(Type.String()),
});

export type BaseBlockAuthSchema<AuthValueSchema> = {
  provider: ConnectionProvider;
  displayName: string;
  description?: string;
  validate?: (params: {
    auth: AuthValueSchema;
  }) => Promise<{ valid: true } | { valid: false; error: string }>;
};
