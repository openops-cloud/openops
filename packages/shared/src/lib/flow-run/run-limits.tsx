import { Static, Type } from '@sinclair/typebox';

export const RunLimit = Type.Object({
  blockName: Type.String(),
  actionName: Type.String(),
  isEnabled: Type.Boolean(),
  limit: Type.Number(),
});

export type RunLimit = Static<typeof RunLimit>;

export const RunLimitSettings = Type.Object({
  isEnabled: Type.Boolean(),
  limits: Type.Array(RunLimit),
});

export type RunLimitSettings = Static<typeof RunLimitSettings>;
