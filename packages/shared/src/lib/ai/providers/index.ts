import { Static, Type } from '@sinclair/typebox';

export const GetProvidersResponse = Type.Object({
  provider: Type.String(),
  displayName: Type.String(),
  models: Type.Array(Type.String()),
});

export type GetProvidersResponse = Static<typeof GetProvidersResponse>;
