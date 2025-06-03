import { Provider } from '@openops/shared';
import { Type } from '@sinclair/typebox';

export const BaseBlockAuthSchema = Type.Object({
  provider: Provider,
  displayName: Type.String(),
  description: Type.Optional(Type.String()),
});

export type BaseBlockAuthSchema<AuthValueSchema> = {
  provider: Provider;
  displayName: string;
  description?: string;
  validate?: (params: {
    auth: AuthValueSchema;
  }) => Promise<{ valid: true } | { valid: false; error: string }>;
};
