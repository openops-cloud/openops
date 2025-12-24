import { Static, Type } from '@sinclair/typebox';
import { BaseModel, BaseModelSchema } from '../common/base-model';
import { OpenOpsId } from '../common/id-generator';
import { EncryptedObject } from '../common/security/encrypted-object';

export const IntegrationAuthorization = Type.Object({
  ...BaseModelSchema,
  userId: OpenOpsId,
  projectId: OpenOpsId,
  organizationId: OpenOpsId,
  token: EncryptedObject,
  integrationName: Type.String(),
  isRevoked: Type.Boolean(),
});

export type IntegrationAuthorization = Static<typeof IntegrationAuthorization> &
  BaseModel<OpenOpsId>;
