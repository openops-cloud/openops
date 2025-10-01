import {
  assertNotNullOrUndefined,
  BranchAction,
  BranchActionSettings,
  BranchCondition,
  BranchOperator,
  BranchStepOutput,
  StepOutputStatus,
} from '@openops/shared';
import deepEqual from 'fast-deep-equal';
import { BaseExecutor } from './base-executor';
import { EngineConstants } from './context/engine-constants';
import {
  ExecutionVerdict,
  FlowExecutorContext,
} from './context/flow-execution-context';
import { flowExecutor } from './flow-executor';

export const branchExecutor: BaseExecutor<BranchAction> = {
  async handle({
    action,
    executionState,
    constants,
  }: {
    action: BranchAction;
    executionState: FlowExecutorContext;
    constants: EngineConstants;
  }) {
    const { censoredInput, resolvedInput } =
      await constants.propsResolver.resolve<BranchActionSettings>({
        unresolvedInput: action.settings,
        executionState,
      });

    const evaluatedCondition = evaluateConditions(resolvedInput.conditions);
    const stepOutput = BranchStepOutput.init({
      input: censoredInput,
    }).setOutput({
      condition: evaluatedCondition,
    });

    try {
      let branchExecutionContext = executionState.upsertStep(
        action.name,
        stepOutput,
      );

      if (!evaluatedCondition && action.onFailureAction) {
        branchExecutionContext = await flowExecutor.executeFromAction({
          action: action.onFailureAction,
          executionState: branchExecutionContext,
          constants,
        });
      }
      if (evaluatedCondition && action.onSuccessAction) {
        branchExecutionContext = await flowExecutor.executeFromAction({
          action: action.onSuccessAction,
          executionState: branchExecutionContext,
          constants,
        });
      }

      return branchExecutionContext;
    } catch (e) {
      console.error(e);
      const failedStepOutput = stepOutput
        .setErrorMessage((e as Error).message)
        .setStatus(StepOutputStatus.FAILED);
      return executionState
        .upsertStep(action.name, failedStepOutput)
        .setVerdict(ExecutionVerdict.FAILED, undefined);
    }
  },
};

export function evaluateConditions(
  conditionGroups: BranchCondition[][],
): boolean {
  let orOperator = false;
  for (const conditionGroup of conditionGroups) {
    let andGroup = true;
    for (const condition of conditionGroup) {
      const castedCondition = condition;
      assertNotNullOrUndefined(
        castedCondition.operator,
        'The operator is required but found to be undefined',
      );
      switch (castedCondition.operator) {
        case BranchOperator.TEXT_CONTAINS: {
          const firstValueContains = toLowercaseIfCaseInsensitive(
            castedCondition.firstValue,
            castedCondition.caseSensitive,
          ).includes(
            toLowercaseIfCaseInsensitive(
              castedCondition.secondValue,
              castedCondition.caseSensitive,
            ),
          );
          andGroup = andGroup && firstValueContains;
          break;
        }
        case BranchOperator.TEXT_DOES_NOT_CONTAIN: {
          const firstValueDoesNotContain = !toLowercaseIfCaseInsensitive(
            castedCondition.firstValue,
            castedCondition.caseSensitive,
          ).includes(
            toLowercaseIfCaseInsensitive(
              castedCondition.secondValue,
              castedCondition.caseSensitive,
            ),
          );
          andGroup = andGroup && firstValueDoesNotContain;
          break;
        }
        case BranchOperator.TEXT_EXACTLY_MATCHES: {
          const firstValueExactlyMatches =
            toLowercaseIfCaseInsensitive(
              castedCondition.firstValue,
              castedCondition.caseSensitive,
            ) ===
            toLowercaseIfCaseInsensitive(
              castedCondition.secondValue,
              castedCondition.caseSensitive,
            );
          andGroup = andGroup && firstValueExactlyMatches;
          break;
        }
        case BranchOperator.TEXT_DOES_NOT_EXACTLY_MATCH: {
          const firstValueDoesNotExactlyMatch =
            toLowercaseIfCaseInsensitive(
              castedCondition.firstValue,
              castedCondition.caseSensitive,
            ) !==
            toLowercaseIfCaseInsensitive(
              castedCondition.secondValue,
              castedCondition.caseSensitive,
            );
          andGroup = andGroup && firstValueDoesNotExactlyMatch;
          break;
        }
        case BranchOperator.TEXT_STARTS_WITH: {
          const firstValueStartsWith = toLowercaseIfCaseInsensitive(
            castedCondition.firstValue,
            castedCondition.caseSensitive,
          ).startsWith(
            toLowercaseIfCaseInsensitive(
              castedCondition.secondValue,
              castedCondition.caseSensitive,
            ),
          );
          andGroup = andGroup && firstValueStartsWith;
          break;
        }
        case BranchOperator.TEXT_ENDS_WITH: {
          const firstValueEndsWith = toLowercaseIfCaseInsensitive(
            castedCondition.firstValue,
            castedCondition.caseSensitive,
          ).endsWith(
            toLowercaseIfCaseInsensitive(
              castedCondition.secondValue,
              castedCondition.caseSensitive,
            ),
          );
          andGroup = andGroup && firstValueEndsWith;
          break;
        }
        case BranchOperator.TEXT_DOES_NOT_START_WITH: {
          const firstValueDoesNotStartWith = !toLowercaseIfCaseInsensitive(
            castedCondition.firstValue,
            castedCondition.caseSensitive,
          ).startsWith(
            toLowercaseIfCaseInsensitive(
              castedCondition.secondValue,
              castedCondition.caseSensitive,
            ),
          );
          andGroup = andGroup && firstValueDoesNotStartWith;
          break;
        }
        case BranchOperator.TEXT_DOES_NOT_END_WITH: {
          const firstValueDoesNotEndWith = !toLowercaseIfCaseInsensitive(
            castedCondition.firstValue,
            castedCondition.caseSensitive,
          ).endsWith(
            toLowercaseIfCaseInsensitive(
              castedCondition.secondValue,
              castedCondition.caseSensitive,
            ),
          );
          andGroup = andGroup && firstValueDoesNotEndWith;
          break;
        }
        case BranchOperator.NUMBER_IS_GREATER_THAN: {
          const firstValue = parseStringToNumber(castedCondition.firstValue);
          const secondValue = parseStringToNumber(castedCondition.secondValue);
          andGroup = andGroup && firstValue > secondValue;
          break;
        }
        case BranchOperator.NUMBER_IS_LESS_THAN: {
          const firstValue = parseStringToNumber(castedCondition.firstValue);
          const secondValue = parseStringToNumber(castedCondition.secondValue);
          andGroup = andGroup && firstValue < secondValue;
          break;
        }
        case BranchOperator.NUMBER_IS_EQUAL_TO: {
          const firstValue = parseStringToNumber(castedCondition.firstValue);
          const secondValue = parseStringToNumber(castedCondition.secondValue);
          andGroup = andGroup && firstValue == secondValue;
          break;
        }
        case BranchOperator.BOOLEAN_IS_TRUE:
          andGroup = andGroup && !!castedCondition.firstValue;
          break;
        case BranchOperator.BOOLEAN_IS_FALSE:
          andGroup = andGroup && !castedCondition.firstValue;
          break;
        case BranchOperator.EXISTS:
          andGroup =
            andGroup &&
            castedCondition.firstValue !== undefined &&
            castedCondition.firstValue !== null &&
            castedCondition.firstValue !== '';
          break;
        case BranchOperator.DOES_NOT_EXIST:
          andGroup =
            andGroup &&
            (castedCondition.firstValue === undefined ||
              castedCondition.firstValue === null ||
              castedCondition.firstValue === '');
          break;
        case BranchOperator.DATE_IS_AFTER:
          andGroup =
            andGroup &&
            compareDates(
              castedCondition.firstValue,
              castedCondition.secondValue,
              (d1, d2) => d1 > d2,
            );
          break;
        case BranchOperator.DATE_IS_BEFORE:
          andGroup =
            andGroup &&
            compareDates(
              castedCondition.firstValue,
              castedCondition.secondValue,
              (d1, d2) => d1 < d2,
            );
          break;
        case BranchOperator.LIST_IS_EMPTY: {
          const list = parseToList(castedCondition.firstValue);
          andGroup = andGroup && Array.isArray(list) && list?.length === 0;
          break;
        }
        case BranchOperator.LIST_IS_NOT_EMPTY: {
          const list = parseToList(castedCondition.firstValue);
          andGroup = andGroup && Array.isArray(list) && list?.length !== 0;
          break;
        }
        case BranchOperator.LIST_COUNT_IS_GREATER_THAN: {
          const list = parseToList(castedCondition.firstValue);
          const secondValue = Number(
            parseStringToNumber(castedCondition.secondValue),
          );
          andGroup =
            andGroup &&
            Array.isArray(list) &&
            !isNaN(secondValue) &&
            list.length > secondValue;
          break;
        }
        case BranchOperator.LIST_COUNT_IS_LESS_THAN: {
          const list = parseToList(castedCondition.firstValue);
          const secondValue = Number(
            parseStringToNumber(castedCondition.secondValue),
          );
          andGroup =
            andGroup &&
            Array.isArray(list) &&
            !isNaN(secondValue) &&
            list.length < secondValue;
          break;
        }
        case BranchOperator.LIST_COUNT_IS_EQUAL_TO: {
          const list = parseToList(castedCondition.firstValue);
          const secondValue = Number(
            parseStringToNumber(castedCondition.secondValue),
          );
          andGroup =
            andGroup &&
            Array.isArray(list) &&
            !isNaN(secondValue) &&
            list?.length === secondValue;
          break;
        }
        case BranchOperator.LIST_CONTAINS: {
          const list = parseToList(
            (castedCondition as { firstValue: string | unknown[] }).firstValue,
          );
          const secondValue = (castedCondition as { secondValue: unknown })
            .secondValue;

          andGroup = andGroup && isContained(list, secondValue);
          break;
        }
        case BranchOperator.LIST_NOT_CONTAINS: {
          const list = parseToList(
            (castedCondition as { firstValue: string | unknown[] }).firstValue,
          );
          const secondValue = (castedCondition as { secondValue: unknown })
            .secondValue;
          andGroup = andGroup && !isContained(list, secondValue);
          break;
        }
        default:
          throw new Error(`Unknown operator ${castedCondition.operator}`);
      }
    }
    orOperator = orOperator || andGroup;
  }
  return Boolean(orOperator);
}

function isContained(list: [] | undefined, secondValue: unknown): boolean {
  if (!Array.isArray(list)) {
    return false;
  }

  const secondToCompare = extractValue(secondValue);

  if (typeof secondToCompare === 'object') {
    return list.some((item) => deepEqual(item, secondToCompare));
  }

  return list.indexOf(secondToCompare as never) !== -1;
}

function extractValue(value: unknown): unknown {
  let returnValue =
    typeof value === 'object'
      ? value
      : typeof value === 'string'
      ? parseToList(value)
      : value;

  if (returnValue === undefined) {
    returnValue = value;
  }
  return returnValue;
}

function toLowercaseIfCaseInsensitive(
  text: unknown,
  caseSensitive: boolean | undefined,
): string {
  if (typeof text === 'string') {
    return caseSensitive ? text : text.toLowerCase();
  } else {
    return caseSensitive
      ? JSON.stringify(text)
      : JSON.stringify(text).toLowerCase();
  }
}

function parseStringToNumber(str: string): number | string {
  const num = Number(str);
  return isNaN(num) ? str : num;
}

function parseToList(input: unknown): [] | undefined {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch (e) {
      return undefined;
    }
  }
  return input as [];
}

function compareDates(
  date1: string,
  date2: string,
  compareFunc: (d1: Date, d2: Date) => boolean,
): boolean {
  if (!date1 || !date2) {
    return false;
  }

  const parsedDate1 = new Date(date1);
  const parsedDate2 = new Date(date2);

  if (!isNaN(parsedDate1.getTime()) && !isNaN(parsedDate2.getTime())) {
    return compareFunc(parsedDate1, parsedDate2);
  }
  return false;
}
