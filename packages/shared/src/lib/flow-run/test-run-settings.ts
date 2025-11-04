import { Static, Type } from '@sinclair/typebox';

export const TestRunLimit = Type.Object(
  {
    blockName: Type.String({
      description:
        "The block's full package name that owns the action (e.g., '@scope/block').",
    }),
    actionName: Type.String({
      description:
        'The exact action name within the block for which the limit applies.',
    }),
    isEnabled: Type.Boolean({
      description:
        'Whether this specific action limit is active during test runs.',
    }),
    limit: Type.Number({
      description:
        'Maximum number of times this action will be executed in a single test run.',
    }),
  },
  {
    description:
      'Per-action write safety limit used when executing workflows in test mode.',
  },
);

export type TestRunLimit = Static<typeof TestRunLimit>;

export const TestRunLimitSettings = Type.Object(
  {
    isEnabled: Type.Boolean({
      description:
        'Master switch to enable or disable all test run action limits for the workflow.',
    }),
    limits: Type.Array(TestRunLimit, {
      description:
        'List of per-action limits that restrict write operations during test runs.',
    }),
  },
  {
    description:
      'Global test run safety configuration combining a master toggle and per-action limits.',
  },
);

export type TestRunLimitSettings = Static<typeof TestRunLimitSettings>;

export function findTestRunLimit(
  limits: TestRunLimit[],
  blockName: string,
  actionName: string,
): TestRunLimit | undefined {
  return limits.find(
    (limit) => limit.blockName === blockName && limit.actionName === actionName,
  );
}
