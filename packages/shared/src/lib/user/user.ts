import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema } from '../common/base-model';
import { OpenOpsId } from '../common/id-generator';

export type UserId = OpenOpsId;

export enum OrganizationRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum UserStatus {
  /* user is active */
  ACTIVE = 'ACTIVE',
  /* user account deactivated */
  INACTIVE = 'INACTIVE',
}

export const EmailType = Type.String({
  format: 'email',
});

export const PasswordType = Type.String({
  minLength: 8,
  maxLength: 64,
});

export const User = Type.Object({
  ...BaseModelSchema,
  email: Type.String(),
  firstName: Type.String(),
  lastName: Type.String(),
  trackEvents: Type.Boolean(),
  newsLetter: Type.Boolean(),
  password: Type.String(),
  verified: Type.Boolean(),
  organizationRole: Type.Enum(OrganizationRole),
  status: Type.Enum(UserStatus),
  externalId: Type.Optional(Type.String()),
  organizationId: Type.Union([OpenOpsId, Type.Null()]),
});

export type User = Static<typeof User>;

export const UserMeta = Type.Object({
  id: Type.String(),
  email: Type.String(),
  firstName: Type.String(),
  organizationId: Type.Union([OpenOpsId, Type.Null()]),
  organizationRole: Type.Enum(OrganizationRole),
  lastName: Type.String(),
  trackEvents: Type.Boolean(),
});

export type UserMeta = Static<typeof UserMeta>;
