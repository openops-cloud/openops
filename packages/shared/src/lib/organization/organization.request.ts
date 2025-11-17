import { Static, Type } from '@sinclair/typebox';

export const UpdateOrganizationRequestBody = Type.Object({
  name: Type.Optional(Type.String()),
  ownerId: Type.Optional(Type.String()),
});

export type UpdateOrganizationRequestBody = Static<
  typeof UpdateOrganizationRequestBody
>;
