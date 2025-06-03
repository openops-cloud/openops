import { ConnectionProvider, Provider } from '@openops/shared';
import { Type } from '@sinclair/typebox';

export const BaseBlockAuthSchema = Type.Object({
  displayName: Type.String(),
  description: Type.Optional(Type.String()),
  provider: Type.Object({
    logoUrl: Type.String(),
    displayName: Type.String(),
    id: Type.Enum(ConnectionProvider),
  }),
});

export type BaseBlockAuthSchema<AuthValueSchema> = {
  provider: Provider;
  displayName: string;
  description?: string;
  validate?: (params: {
    auth: AuthValueSchema;
  }) => Promise<{ valid: true } | { valid: false; error: string }>;
};
