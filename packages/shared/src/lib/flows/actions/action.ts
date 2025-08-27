import { Static, Type } from '@sinclair/typebox';
import { BlockType, PackageType, VersionType } from '../../blocks';
import { SampleDataSettingsObject } from '../sample-data';
import { BlockTriggerSettings } from '../triggers/trigger';

export enum ActionType {
  CODE = 'CODE',
  BLOCK = 'BLOCK',
  LOOP_ON_ITEMS = 'LOOP_ON_ITEMS',
  BRANCH = 'BRANCH',
  SPLIT = 'SPLIT',
}

export enum RiskLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

const commonActionProps = {
  id: Type.String({
    description: 'Unique identifier for the step (action)',
  }),
  name: Type.String({
    description:
      'Name of the step (action), used for reference in other step configurations.',
  }),
  valid: Type.Boolean({
    description:
      'Indicates whether the action is currently valid and can be executed',
  }),
  displayName: Type.String({
    description: 'Human-readable name for the action, intended for UI display',
  }),
};

export const InputsSchema = Type.Object(
  {},
  {
    additionalProperties: true,
    description:
      'All action-specific properties must be contained within the `input` object, not at the root level. ' +
      'The `input` object is a mapping of property keys to their chosen values (`input: { propertyKey → propertyValue }`). ' +
      'Keys must exactly match the action property keys returned by the action details tool, and values must follow the expected types and constraints. ' +
      'The `input` object may be empty. For optional properties, omit the key if the value is unknown. ' +
      'For required properties, include the key with a `null` value if the value is unknown. ' +
      'Output values from other steps can be referenced. Example: {{step_1}}, or access inner properties as {{step_1.property}}',
  },
);

export const ActionErrorHandlingOptions = Type.Optional(
  Type.Object({
    continueOnFailure: Type.Optional(
      Type.Object({
        value: Type.Boolean(),
      }),
    ),
    retryOnFailure: Type.Optional(
      Type.Object({
        value: Type.Boolean(),
      }),
    ),
  }),
);
export type ActionErrorHandlingOptions = Static<
  typeof ActionErrorHandlingOptions
>;

export const SourceCode = Type.Object({
  packageJson: Type.String({
    description: `JSON string for a minimal package.json snippet focused on runtime dependencies. It must be a JSON object with an optional 'dependencies' field mapping package names to version ranges.

Example:

\`\`\`json
{
  "dependencies": {
    "stylus": "0.64.0"
  }
}
\`\`\`

Use '{}' when there are no dependencies.`,
  }),
  code: Type.String({
    description: `TypeScript source for this step. Executes in an isolated-vm environment (secure and isolated JavaScript runtime). To use data from previous steps, pass them as key–value pairs and access them via 'inputs.key' in your code. The entry point must be an exported function named 'code'. If it is removed or renamed, the step will fail.

code MUST follow this exact interface:

\`\`\`javascript
export const code = async (inputs) => {
  // Your transformation logic here
  // Process the inputs object
  // Return the result
  return result;
};
\`\`\`

CRITICAL CONSTRAINTS:
- Only use ES6 imports if critically needed, otherwise don't use external dependencies 
- NO require() statements
- NO access to Node.js native modules (fs, process, http, crypto, path, os, etc.)
- NO file system operations or network requests
- Use bracket notation for dynamic properties (data['propertyName'])
- AVOID Direct property access on inferred object types (example: if (!data.propertyName) { // ❌ May cause TS2339 errors)
`,
  }),
});

export type SourceCode = Static<typeof SourceCode>;

export const CodeActionSettings = Type.Object({
  sourceCode: SourceCode,
  input: InputsSchema,
  inputUiInfo: Type.Optional(SampleDataSettingsObject),
  errorHandlingOptions: ActionErrorHandlingOptions,
});

export type CodeActionSettings = Static<typeof CodeActionSettings>;

export const CodeActionSchema = Type.Object({
  ...commonActionProps,
  type: Type.Literal(ActionType.CODE),
  settings: CodeActionSettings,
});
export const BlockActionSettings = Type.Object({
  packageType: Type.Enum(PackageType),
  blockType: Type.Enum(BlockType),
  blockName: Type.String({
    description:
      "The complete package identifier, formatted as 'packageScope/packageName'. This must exactly match the block name as registered (e.g., '@org/one-block').",
  }),
  blockVersion: VersionType,
  actionName: Type.Optional(Type.String({})),
  input: InputsSchema,
  inputUiInfo: SampleDataSettingsObject,
  errorHandlingOptions: ActionErrorHandlingOptions,
});
export type BlockActionSettings = Static<typeof BlockActionSettings>;

export const BlockActionSchema = Type.Object({
  ...commonActionProps,
  type: Type.Literal(ActionType.BLOCK),
  settings: BlockActionSettings,
});

export const LoopOnItemsActionSettings = Type.Object({
  items: Type.String(),
  inputUiInfo: SampleDataSettingsObject,
});

export const LoopOnItemsActionSettingsWithValidation = Type.Intersect([
  LoopOnItemsActionSettings,
  Type.Object({
    items: Type.String({ minLength: 1 }),
  }),
]);

export type LoopOnItemsActionSettings = Static<
  typeof LoopOnItemsActionSettings
>;

export const LoopOnItemsActionSchema = Type.Object({
  ...commonActionProps,
  type: Type.Literal(ActionType.LOOP_ON_ITEMS),
  settings: LoopOnItemsActionSettings,
});

export enum BranchOperator {
  TEXT_CONTAINS = 'TEXT_CONTAINS',
  TEXT_DOES_NOT_CONTAIN = 'TEXT_DOES_NOT_CONTAIN',
  TEXT_EXACTLY_MATCHES = 'TEXT_EXACTLY_MATCHES',
  TEXT_DOES_NOT_EXACTLY_MATCH = 'TEXT_DOES_NOT_EXACTLY_MATCH',
  TEXT_STARTS_WITH = 'TEXT_START_WITH',
  TEXT_DOES_NOT_START_WITH = 'TEXT_DOES_NOT_START_WITH',
  TEXT_ENDS_WITH = 'TEXT_ENDS_WITH',
  TEXT_DOES_NOT_END_WITH = 'TEXT_DOES_NOT_END_WITH',
  NUMBER_IS_GREATER_THAN = 'NUMBER_IS_GREATER_THAN',
  NUMBER_IS_LESS_THAN = 'NUMBER_IS_LESS_THAN',
  NUMBER_IS_EQUAL_TO = 'NUMBER_IS_EQUAL_TO',
  BOOLEAN_IS_TRUE = 'BOOLEAN_IS_TRUE',
  BOOLEAN_IS_FALSE = 'BOOLEAN_IS_FALSE',
  DATE_IS_BEFORE = 'DATE_IS_BEFORE',
  DATE_IS_AFTER = 'DATE_IS_AFTER',
  LIST_IS_EMPTY = 'LIST_IS_EMPTY',
  LIST_IS_NOT_EMPTY = 'LIST_IS_NOT_EMPTY',
  LIST_COUNT_IS_GREATER_THAN = 'LIST_COUNT_IS_GREATER_THAN',
  LIST_COUNT_IS_LESS_THAN = 'LIST_COUNT_IS_LESS_THAN',
  LIST_COUNT_IS_EQUAL_TO = 'LIST_COUNT_IS_EQUAL_TO',
  EXISTS = 'EXISTS',
  DOES_NOT_EXIST = 'DOES_NOT_EXIST',
  LIST_CONTAINS = 'LIST_CONTAINS',
  LIST_NOT_CONTAINS = 'LIST_NOT_CONTAINS',
}

export const singleValueConditions = [
  BranchOperator.EXISTS,
  BranchOperator.DOES_NOT_EXIST,
  BranchOperator.BOOLEAN_IS_TRUE,
  BranchOperator.BOOLEAN_IS_FALSE,
  BranchOperator.LIST_IS_EMPTY,
  BranchOperator.LIST_IS_NOT_EMPTY,
];

export const textConditions = [
  BranchOperator.TEXT_CONTAINS,
  BranchOperator.TEXT_DOES_NOT_CONTAIN,
  BranchOperator.TEXT_EXACTLY_MATCHES,
  BranchOperator.TEXT_DOES_NOT_EXACTLY_MATCH,
  BranchOperator.TEXT_STARTS_WITH,
  BranchOperator.TEXT_DOES_NOT_START_WITH,
  BranchOperator.TEXT_ENDS_WITH,
  BranchOperator.TEXT_DOES_NOT_END_WITH,
];

const BranchOperatorTextLiterals = [
  Type.Literal(BranchOperator.TEXT_CONTAINS),
  Type.Literal(BranchOperator.TEXT_DOES_NOT_CONTAIN),
  Type.Literal(BranchOperator.TEXT_EXACTLY_MATCHES),
  Type.Literal(BranchOperator.TEXT_DOES_NOT_EXACTLY_MATCH),
  Type.Literal(BranchOperator.TEXT_STARTS_WITH),
  Type.Literal(BranchOperator.TEXT_DOES_NOT_START_WITH),
  Type.Literal(BranchOperator.TEXT_ENDS_WITH),
  Type.Literal(BranchOperator.TEXT_DOES_NOT_END_WITH),
  Type.Literal(BranchOperator.LIST_CONTAINS),
  Type.Literal(BranchOperator.LIST_NOT_CONTAINS),
];

const BranchOperatorNumberLiterals = [
  Type.Literal(BranchOperator.NUMBER_IS_GREATER_THAN),
  Type.Literal(BranchOperator.NUMBER_IS_LESS_THAN),
  Type.Literal(BranchOperator.NUMBER_IS_EQUAL_TO),
  Type.Literal(BranchOperator.LIST_COUNT_IS_EQUAL_TO),
  Type.Literal(BranchOperator.LIST_COUNT_IS_GREATER_THAN),
  Type.Literal(BranchOperator.LIST_COUNT_IS_LESS_THAN),
  Type.Literal(BranchOperator.LIST_CONTAINS),
  Type.Literal(BranchOperator.LIST_NOT_CONTAINS),
];

const BranchOperatorDateLiterals = [
  Type.Literal(BranchOperator.DATE_IS_BEFORE),
  Type.Literal(BranchOperator.DATE_IS_AFTER),
];

const BranchOperatorSingleValueLiterals = [
  Type.Literal(BranchOperator.EXISTS),
  Type.Literal(BranchOperator.DOES_NOT_EXIST),
  Type.Literal(BranchOperator.BOOLEAN_IS_TRUE),
  Type.Literal(BranchOperator.BOOLEAN_IS_FALSE),
  Type.Literal(BranchOperator.LIST_IS_EMPTY),
  Type.Literal(BranchOperator.LIST_IS_NOT_EMPTY),
];

const BranchTextConditionValid = (addMinLength: boolean) =>
  Type.Object({
    firstValue: Type.String(addMinLength ? { minLength: 1 } : {}),
    secondValue: Type.String(addMinLength ? { minLength: 1 } : {}),
    caseSensitive: Type.Optional(Type.Boolean()),
    operator: Type.Optional(Type.Union(BranchOperatorTextLiterals)),
  });

const BranchNumberConditionValid = (addMinLength: boolean) =>
  Type.Object({
    firstValue: Type.String(addMinLength ? { minLength: 1 } : {}),
    secondValue: Type.String(addMinLength ? { minLength: 1 } : {}),
    operator: Type.Optional(Type.Union(BranchOperatorNumberLiterals)),
  });

const BranchSingleValueConditionValid = (addMinLength: boolean) =>
  Type.Object({
    firstValue: Type.String(addMinLength ? { minLength: 1 } : {}),
    operator: Type.Optional(Type.Union(BranchOperatorSingleValueLiterals)),
  });

const BranchDateConditionValid = (addMinLength: boolean) =>
  Type.Object({
    firstValue: Type.String(addMinLength ? { minLength: 1 } : {}),
    secondValue: Type.String(addMinLength ? { minLength: 1 } : {}),
    operator: Type.Optional(Type.Union(BranchOperatorDateLiterals)),
  });

const BranchConditionValid = (addMinLength: boolean) =>
  Type.Union([
    BranchTextConditionValid(addMinLength),
    BranchNumberConditionValid(addMinLength),
    BranchDateConditionValid(addMinLength),
    BranchSingleValueConditionValid(addMinLength), // keep this as the last one
  ]);

export const BranchActionSettingsWithValidation = Type.Object({
  conditions: Type.Array(Type.Array(BranchConditionValid(true))),
  inputUiInfo: SampleDataSettingsObject,
});

export const ValidBranchCondition = BranchConditionValid(true);
export type ValidBranchCondition = Static<typeof ValidBranchCondition>;

// TODO remove this and use ValidBranchCondition everywhere
export const BranchCondition = BranchConditionValid(false);
export type BranchCondition = Static<typeof BranchCondition>;

export const BranchTextCondition = BranchTextConditionValid(false);
export type BranchTextCondition = Static<typeof BranchTextCondition>;

export const BranchNumberCondition = BranchNumberConditionValid(false);
export type BranchNumberCondition = Static<typeof BranchNumberCondition>;

export const BranchSingleValueCondition =
  BranchSingleValueConditionValid(false);
export type BranchSingleValueCondition = Static<
  typeof BranchSingleValueCondition
>;

export const BranchDateCondition = BranchDateConditionValid(false);
export type BranchDateCondition = Static<typeof BranchDateCondition>;

export const BranchActionSettings = Type.Object({
  conditions: Type.Array(Type.Array(BranchConditionValid(false))),
  inputUiInfo: SampleDataSettingsObject,
});
export type BranchActionSettings = Static<typeof BranchActionSettings>;

export const BranchActionSchema = Type.Object({
  ...commonActionProps,
  type: Type.Literal(ActionType.BRANCH),
  settings: BranchActionSettings,
});

export const SplitOption = Type.Object({
  id: Type.String(),
  name: Type.String(),
  conditions: Type.Array(Type.Array(BranchConditionValid(false))),
});

export type SplitOption = Static<typeof SplitOption>;

export const SplitActionSettings = Type.Object({
  inputUiInfo: SampleDataSettingsObject,
  defaultBranch: Type.String({}),
  options: Type.Array(SplitOption),
});

export type SplitBranch = { optionId: string; nextAction?: Action };
export type SplitActionSettings = Static<typeof SplitActionSettings>;

export const SplitActionSettingsWithValidation = Type.Object({});

export const SplitActionSchema = Type.Object({
  ...commonActionProps,
  type: Type.Literal(ActionType.SPLIT),
  settings: SplitActionSettings,
  branches: Type.Optional(
    Type.Array(
      Type.Object({
        optionId: Type.String(),
        nextAction: Type.Optional(Type.Any()),
      }),
    ),
  ),
});

// Union of all actions

export const Action = Type.Recursive((action) =>
  Type.Union([
    Type.Intersect([
      CodeActionSchema,
      Type.Object({
        nextAction: Type.Optional(action),
      }),
    ]),
    Type.Intersect([
      BlockActionSchema,
      Type.Object({
        nextAction: Type.Optional(action),
      }),
    ]),
    Type.Intersect([
      LoopOnItemsActionSchema,
      Type.Object({
        nextAction: Type.Optional(action),
        firstLoopAction: Type.Optional(action),
      }),
    ]),
    Type.Intersect([
      BranchActionSchema,
      Type.Object({
        nextAction: Type.Optional(action),
        onSuccessAction: Type.Optional(action),
        onFailureAction: Type.Optional(action),
      }),
    ]),
    Type.Intersect([
      SplitActionSchema,
      Type.Object({
        nextAction: Type.Optional(action),
        branches: Type.Array(
          Type.Object({
            optionId: Type.String(),
            nextAction: Type.Optional(action),
          }),
        ),
      }),
    ]),
  ]),
);

export const SingleActionSchema = Type.Union([
  CodeActionSchema,
  BlockActionSchema,
  LoopOnItemsActionSchema,
  BranchActionSchema,
  SplitActionSchema,
]);

export type Action = Static<typeof Action>;

export type BranchAction = Static<typeof BranchActionSchema> & {
  nextAction?: Action;
  onFailureAction?: Action;
  onSuccessAction?: Action;
};

export type SplitActionSchema = Static<typeof SplitActionSchema>;

export type SplitAction = Static<typeof SplitActionSchema> & {
  nextAction?: Action;
  branches: SplitBranch[];
};

export type LoopOnItemsAction = Static<typeof LoopOnItemsActionSchema> & {
  nextAction?: Action;
  firstLoopAction?: Action;
};

export type BlockAction = Static<typeof BlockActionSchema> & {
  nextAction?: Action;
};

export type CodeAction = Static<typeof CodeActionSchema> & {
  nextAction?: Action;
};

export type StepSettings =
  | CodeActionSettings
  | BlockActionSettings
  | BlockTriggerSettings
  | BranchActionSettings
  | SplitActionSettings
  | LoopOnItemsActionSettings;
