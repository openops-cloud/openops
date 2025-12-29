import { Static, Type } from '@sinclair/typebox';
import { BaseModel, BaseModelSchema, Nullable } from '../common/base-model';
import { OpenOpsId } from '../common/id-generator';

export const RefreshToken = Type.Object({
  ...BaseModelSchema,
  projectId: OpenOpsId,
  userId: OpenOpsId,
  client: Type.String(),
  refresh_token: Type.String(),
  principal: Type.Any(),
  is_revoked: Type.Boolean(),
  revoked_at: Nullable(Type.String()),
  expirationTime: Nullable(Type.String()),
});

export type RefreshToken = Static<typeof RefreshToken> & BaseModel<OpenOpsId>;
