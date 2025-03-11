import { Static, Type } from '@sinclair/typebox';
import { OrganizationRole, UserStatus } from './user';

export * from './user';
export * from './user-dto';

export const UpdateUserRequestBody = Type.Object({
  status: Type.Optional(Type.Enum(UserStatus)),
  organizationRole: Type.Optional(Type.Enum(OrganizationRole)),
});

export type UpdateUserRequestBody = Static<typeof UpdateUserRequestBody>;

export const UpdateTrackingRequestBody = Type.Object({
  trackEvents: Type.Boolean(),
});

export type UpdateTrackingRequestBody = Static<
  typeof UpdateTrackingRequestBody
>;
