import {
  BlockAuthProperty,
  BlockMetadata,
  BlockMetadataModel,
  BlockPropertyMap,
  CONNECTION_REGEX,
  OAuth2Props,
  PropertyType,
} from '@openops/blocks-framework';
import {
  Action,
  ActionType,
  BlockActionSchema,
  BlockActionSettings,
  BlockTrigger,
  BlockTriggerSettings,
  BranchActionSchema,
  BranchOperator,
  CodeActionSchema,
  isEmpty,
  isNil,
  LoopOnItemsActionSchema,
  SplitActionSchema,
  spreadIfDefined,
  Trigger,
  TriggerType,
  ValidBranchCondition,
} from '@openops/shared';
import { TSchema, Type } from '@sinclair/typebox';

import { createDefaultOptionSettings } from '../step-settings/split-settings/utils';

function addAuthToBlockProps(
  props: BlockPropertyMap,
  auth: BlockAuthProperty | undefined,
  requireAuth?: boolean,
): BlockPropertyMap {
  if (!requireAuth) {
    return props;
  }
  return {
    ...props,
    ...spreadIfDefined('auth', auth),
  };
}

const nullableType: TSchema[] = [
  Type.Null(),
  Type.Undefined(),
  Type.String({
    minLength: 0,
    maxLength: 0,
  }),
];
const nonNullableUnknownPropType = Type.Not(
  Type.Union(nullableType),
  Type.Unknown(),
);

function buildInputSchemaForStep(
  type: ActionType | TriggerType,
  block: BlockMetadata | null,
  actionNameOrTriggerName: string,
): TSchema {
  switch (type) {
    case ActionType.BLOCK: {
      if (
        block &&
        actionNameOrTriggerName &&
        block.actions[actionNameOrTriggerName]
      ) {
        return formUtils.buildSchema(
          addAuthToBlockProps(
            block.actions[actionNameOrTriggerName]?.props,
            block.auth,
            block.actions[actionNameOrTriggerName]?.requireAuth,
          ),
        );
      }
      return Type.Object({});
    }
    case TriggerType.BLOCK: {
      if (
        block &&
        actionNameOrTriggerName &&
        block.triggers[actionNameOrTriggerName]
      ) {
        return formUtils.buildSchema(
          addAuthToBlockProps(
            block.triggers[actionNameOrTriggerName]?.props,
            block.auth,
            !!block.auth,
          ),
        );
      }
      return Type.Object({});
    }
    default:
      throw new Error('Unsupported type: ' + type);
  }
}

export const formUtils = {
  buildBlockDefaultValue: (
    selectedStep: Action | Trigger,
    block: BlockMetadata | null | undefined,
    includeCurrentInput: boolean,
  ): Action | Trigger => {
    const { type } = selectedStep;
    const defaultErrorOptions = {
      continueOnFailure: {
        value:
          selectedStep.settings.errorHandlingOptions?.continueOnFailure
            ?.value ?? false,
      },
      retryOnFailure: {
        value:
          selectedStep.settings.errorHandlingOptions?.retryOnFailure?.value ??
          false,
      },
    };
    switch (type) {
      case ActionType.LOOP_ON_ITEMS:
        return {
          ...selectedStep,
          settings: {
            ...selectedStep.settings,
            items: selectedStep.settings.items ?? '',
          },
        };
      case ActionType.BRANCH:
        return {
          ...selectedStep,
          settings: {
            ...selectedStep.settings,
            conditions: selectedStep.settings.conditions ?? [
              [
                {
                  operator: BranchOperator.TEXT_EXACTLY_MATCHES,
                  firstValue: '',
                  secondValue: '',
                  caseSensitive: false,
                },
              ],
            ],
            inputUiInfo: {},
          },
        };
      case ActionType.SPLIT: {
        const defaultOptions = createDefaultOptionSettings();
        const defaultBranchIfNotDefined = defaultOptions[0].id;

        return {
          ...selectedStep,
          settings: {
            ...selectedStep.settings,
            inputUiInfo: {},
            defaultBranch:
              selectedStep.settings.defaultBranch ?? defaultBranchIfNotDefined,
            options:
              selectedStep.settings.options ?? createDefaultOptionSettings(),
          },
          branches: selectedStep.branches ?? [],
        };
      }
      case ActionType.CODE: {
        const defaultCode = `export const code = async (inputs) => {
  return true;
};`;
        return {
          ...selectedStep,
          settings: {
            ...selectedStep.settings,
            sourceCode: {
              code: selectedStep.settings.sourceCode.code ?? defaultCode,
              packageJson: selectedStep.settings.sourceCode.packageJson ?? '{}',
            },
            errorHandlingOptions: defaultErrorOptions,
          },
        };
      }
      case ActionType.BLOCK: {
        const actionName = selectedStep?.settings?.actionName;
        const requireAuth = isNil(actionName)
          ? false
          : block?.actions?.[actionName]?.requireAuth ?? false;
        const actionPropsWithoutAuth =
          actionName !== undefined
            ? block?.actions?.[actionName]?.props ?? {}
            : {};
        const props = addAuthToBlockProps(
          actionPropsWithoutAuth,
          block?.auth,
          requireAuth,
        );
        const input = (selectedStep?.settings?.input ?? {}) as Record<
          string,
          unknown
        >;
        const defaultValues = getDefaultValueForStep(
          props ?? {},
          includeCurrentInput ? input : {},
        );
        return {
          ...selectedStep,
          settings: {
            ...selectedStep.settings,
            input: defaultValues,
            errorHandlingOptions: defaultErrorOptions,
          },
        };
      }
      case TriggerType.BLOCK: {
        const triggerName = selectedStep?.settings?.triggerName;
        const triggerPropsWithoutAuth =
          triggerName !== undefined
            ? block?.triggers?.[triggerName]?.props ?? {}
            : {};
        const props = addAuthToBlockProps(
          triggerPropsWithoutAuth,
          block?.auth,
          true,
        );
        const input = (selectedStep?.settings?.input ?? {}) as Record<
          string,
          unknown
        >;
        const defaultValues = getDefaultValueForStep(
          props ?? {},
          includeCurrentInput ? input : {},
        );

        return {
          ...selectedStep,
          settings: {
            ...selectedStep.settings,
            input: defaultValues,
          },
        };
      }
      default:
        throw new Error('Unsupported type: ' + type);
    }
  },
  buildBlockSchema: (
    type: ActionType | TriggerType,
    actionNameOrTriggerName: string,
    block: BlockMetadataModel | null,
  ) => {
    switch (type) {
      case ActionType.LOOP_ON_ITEMS:
        return Type.Composite([
          LoopOnItemsActionSchema,
          Type.Object({
            settings: Type.Object({
              items: Type.String({
                minLength: 1,
              }),
            }),
          }),
        ]);
      case ActionType.BRANCH:
        return Type.Composite([
          BranchActionSchema,
          Type.Object({
            settings: Type.Object({
              conditions: Type.Array(Type.Array(ValidBranchCondition)),
            }),
          }),
        ]);
      case ActionType.SPLIT:
        return Type.Composite([
          SplitActionSchema,
          Type.Object({
            settings: Type.Object({
              defaultBranch: Type.String({
                minLength: 1,
                errorMessage: 'Setting a default is required',
              }),
              options: Type.Array(
                Type.Object({
                  name: Type.String({
                    minLength: 1,
                  }),
                  conditions: Type.Array(Type.Array(ValidBranchCondition)),
                }),
                {
                  minItems: 2,
                },
              ),
            }),
          }),
        ]);
      case ActionType.CODE:
        return CodeActionSchema;
      case ActionType.BLOCK: {
        return Type.Composite([
          Type.Omit(BlockActionSchema, ['settings']),
          Type.Object({
            settings: Type.Composite([
              Type.Omit(BlockActionSettings, ['input', 'actionName']),
              Type.Object({
                actionName: Type.String({
                  minLength: 1,
                }),
                input: buildInputSchemaForStep(
                  type,
                  block,
                  actionNameOrTriggerName,
                ),
              }),
            ]),
          }),
        ]);
      }
      case TriggerType.BLOCK: {
        return Type.Composite([
          Type.Omit(BlockTrigger, ['settings']),
          Type.Object({
            settings: Type.Composite([
              Type.Omit(BlockTriggerSettings, ['input', 'triggerName']),
              Type.Object({
                triggerName: Type.String({
                  minLength: 1,
                }),
                input: buildInputSchemaForStep(
                  type,
                  block,
                  actionNameOrTriggerName,
                ),
              }),
            ]),
          }),
        ]);
      }
      default: {
        throw new Error('Unsupported type: ' + type);
      }
    }
  },
  buildSchema: (props: BlockPropertyMap) => {
    const entries = Object.entries(props);
    const propsSchema: Record<string, TSchema> = {};

    for (const [name, property] of entries) {
      switch (property.type) {
        case PropertyType.MARKDOWN:
          propsSchema[name] = Type.Optional(
            Type.Union([
              Type.Null(),
              Type.Undefined(),
              Type.Never(),
              Type.Unknown(),
            ]),
          );
          break;
        case PropertyType.DATE_TIME:
        case PropertyType.SHORT_TEXT:
        case PropertyType.LONG_TEXT:
        case PropertyType.FILE:
          propsSchema[name] = Type.String({
            minLength: property.required ? 1 : undefined,
          });
          break;
        case PropertyType.CHECKBOX:
          propsSchema[name] = Type.Union([
            Type.Boolean(),
            Type.String({
              minLength: property.required ? 1 : undefined,
            }),
          ]);
          break;
        case PropertyType.NUMBER:
          // Because it could be a variable
          propsSchema[name] = Type.Union([
            Type.String({
              minLength: property.required ? 1 : undefined,
            }),
            Type.Number(),
          ]);
          break;
        case PropertyType.STATIC_DROPDOWN:
          propsSchema[name] = nonNullableUnknownPropType;
          break;
        case PropertyType.DROPDOWN:
          propsSchema[name] = nonNullableUnknownPropType;
          break;
        case PropertyType.BASIC_AUTH:
        case PropertyType.CUSTOM_AUTH:
        case PropertyType.SECRET_TEXT:
        case PropertyType.OAUTH2:
          // Only accepts connections variable.
          propsSchema[name] = Type.Union([
            Type.String({
              pattern: CONNECTION_REGEX,
              minLength: property.required ? 1 : undefined,
            }),
            Type.String({
              minLength: property.required ? 1 : undefined,
            }),
          ]);
          break;
        case PropertyType.ARRAY: {
          //use array type for array of primitives
          //string type is intended for a dynamic field.
          if (isNil(property.properties)) {
            propsSchema[name] = Type.Union([
              Type.String({
                minLength: property.required ? 1 : undefined,
              }),
              Type.Array(
                Type.String({
                  minLength: property.required ? 1 : undefined,
                }),
                {
                  minItems: property.required ? 1 : undefined,
                },
              ),
            ]);
            break;
          }

          // Array of objects is configured in the ArrayBlockProperty component
          propsSchema[name] = Type.Tuple([]);
          break;
        }
        case PropertyType.OBJECT:
          //string type is intended for a dynamic field.
          propsSchema[name] = propsSchema[name] = Type.Union([
            Type.Record(
              Type.String({
                minLength: property.required ? 1 : undefined,
              }),
              Type.String({
                minLength: property.required ? 1 : undefined,
              }),
              { minProperties: property.required ? 1 : undefined },
            ),
            Type.String({
              minLength: property.required ? 1 : undefined,
            }),
          ]);

          break;
        case PropertyType.JSON:
          propsSchema[name] = Type.Union([
            Type.Record(Type.String(), Type.Any()),
            Type.Array(Type.Any()),
            Type.String({
              minLength: property.required ? 1 : undefined,
            }),
          ]);
          break;
        case PropertyType.MULTI_SELECT_DROPDOWN:
        case PropertyType.STATIC_MULTI_SELECT_DROPDOWN:
          propsSchema[name] = Type.Union([
            Type.Array(Type.Any(), {
              minItems: property.required ? 1 : undefined,
            }),
            Type.String({
              minLength: property.required ? 1 : undefined,
            }),
          ]);
          break;
        case PropertyType.DYNAMIC:
          propsSchema[name] = Type.Record(Type.String(), Type.Any());
          break;
      }

      //optional array is checked against its children
      if (!property.required && property.type !== PropertyType.ARRAY) {
        propsSchema[name] = Type.Optional(
          Type.Union(
            isEmpty(propsSchema[name])
              ? [Type.Any(), ...nullableType]
              : [propsSchema[name], ...nullableType],
          ),
        );
      }
    }

    return Type.Object(propsSchema);
  },
  getDefaultValueForStep,
};

function getDefaultValueForStep(
  props: BlockPropertyMap | OAuth2Props,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const defaultValues: Record<string, unknown> = {};
  const entries = Object.entries(props);
  for (const [name, property] of entries) {
    switch (property.type) {
      case PropertyType.CHECKBOX:
        defaultValues[name] = input[name] ?? property.defaultValue ?? false;
        break;
      case PropertyType.ARRAY:
      case PropertyType.MULTI_SELECT_DROPDOWN:
      case PropertyType.STATIC_MULTI_SELECT_DROPDOWN:
        defaultValues[name] = input[name] ?? property.defaultValue ?? [];
        break;
      case PropertyType.MARKDOWN:
      case PropertyType.DATE_TIME:
      case PropertyType.SHORT_TEXT:
      case PropertyType.LONG_TEXT:
      case PropertyType.FILE:
      case PropertyType.STATIC_DROPDOWN:
      case PropertyType.DROPDOWN:
      case PropertyType.BASIC_AUTH:
      case PropertyType.CUSTOM_AUTH:
      case PropertyType.SECRET_TEXT:
      case PropertyType.OAUTH2:
      case PropertyType.NUMBER:
      case PropertyType.JSON: {
        defaultValues[name] = input[name] ?? property.defaultValue ?? null;
        break;
      }
      case PropertyType.OBJECT:
      case PropertyType.DYNAMIC:
        defaultValues[name] = input[name] ?? property.defaultValue ?? {};
        break;
    }
  }
  return defaultValues;
}
