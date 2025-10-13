import { Static, Type } from '@sinclair/typebox';

export const TestRunLimit = Type.Object({
  blockName: Type.String(),
  actionName: Type.String(),
  isEnabled: Type.Boolean(),
  limit: Type.Number(),
});

export type TestRunLimit = Static<typeof TestRunLimit>;

export const TestRunLimitSettings = Type.Object({
  isEnabled: Type.Boolean(),
  limits: Type.Array(TestRunLimit),
});

export type TestRunLimitSettings = Static<typeof TestRunLimitSettings>;
