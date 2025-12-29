import { Static, Type } from '@sinclair/typebox';
import { PrincipalType } from '../authentication/model/principal-type';
import { BaseModel, BaseModelSchema, Nullable } from '../common/base-model';
import { OpenOpsId } from '../common/id-generator';

export const RefreshToken = Type.Object({
  ...BaseModelSchema,
  projectId: OpenOpsId,
  userId: OpenOpsId,
  client: Type.String(),
  refreshToken: Type.String(),
  principal: Type.Any(),
  isRevoked: Type.Boolean(),
  revokedAt: Nullable(Type.String()),
  expirationTime: Nullable(Type.String()),
});

export type RefreshToken = Static<typeof RefreshToken> & BaseModel<OpenOpsId>;

export enum RefreshTokenClient {
  SLACK_BOT = 'SLACK_BOT',
}

export const RefreshTokenClientPrincipals = {
  [RefreshTokenClient.SLACK_BOT]: {
    id: 'slack-bot',
    type: PrincipalType.AI_CLIENT,
  },
} as const;
