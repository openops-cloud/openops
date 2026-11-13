/* eslint-disable @typescript-eslint/no-explicit-any */
import { applyFunctionToKeysAndValues, isNil, isString } from '@openops/shared';
import { initCodeSandbox } from '../core/code/code-sandbox';
import { ScriptSession } from '../core/code/code-sandbox-common';
import { FlowExecutorContext } from '../handler/context/flow-execution-context';
import { createConnectionService } from '../services/connections.service';
import {
  cloneJson,
  extractReferencedStepNames,
  parsePropertyPath,
  resolvePropertyPath,
} from './property-path';

const VARIABLE_PATTERN = /\{\{(.*?)\}\}/g;
const CONNECTIONS = 'connections';
// The isolate sandbox's bootstrap redefines these when the global of that name is not a function, so a
// step with such a name must keep resolving through the sandbox to behave as before (harmless in no-op mode).
const SANDBOX_POLYFILL_GLOBALS = new Set([
  'btoa',
  'atob',
  'btoaUtf8',
  'atobUtf8',
]);
const FLATTEN_NESTED_KEYS_PATTERN = /\{\{\s*flattenNestedKeys(.*?)\}\}/g;

type PropsResolverParams = {
  engineToken: string;
  projectId: string;
  apiUrl: string;
};

export const createPropsResolver = ({
  engineToken,
  projectId,
  apiUrl,
}: PropsResolverParams) => {
  return {
    resolve: async <T = unknown>(
      params: ResolveInputParams,
    ): Promise<ResolveResult<T>> => {
      const { unresolvedInput, executionState } = params;
      if (isNil(unresolvedInput)) {
        return {
          resolvedInput: unresolvedInput as T,
          censoredInput: unresolvedInput,
        };
      }
      const scope = createResolveScope(executionState);
      try {
        const resolveOptions = {
          engineToken,
          projectId,
          apiUrl,
          scope,
        };
        const resolvedInput = await applyFunctionToKeysAndValues<T>(
          unresolvedInput,
          (token) =>
            resolveInputAsync({
              ...resolveOptions,
              input: token,
              censoredInput: false,
            }),
        );
        const censoredInput = await applyFunctionToKeysAndValues<T>(
          unresolvedInput,
          (token) =>
            resolveInputAsync({
              ...resolveOptions,
              input: token,
              censoredInput: true,
            }),
        );
        return {
          resolvedInput,
          censoredInput,
        };
      } finally {
        await scope.dispose();
      }
    },
  };
};

/**
 * Everything one `resolve()` call shares between its tokens and its two passes: the step names in
 * scope, the live and JSON-cloned step outputs (each step read and cloned at most once), and a lazily
 * created script session for tokens that are real expressions. Nothing outlives the call, so loop
 * `item`/`index` are always the ones upserted for the current iteration.
 */
type ResolveScope = {
  stepNames: string[];
  stepNameSet: Set<string>;
  getLiveOutput(stepName: string): unknown;
  getClonedOutput(stepName: string): unknown;
  getSession(): Promise<ScriptSession>;
  dispose(): Promise<void>;
};

class CloneFailure {
  constructor(readonly cause: unknown) {}
}

function createResolveScope(executionState: FlowExecutorContext): ResolveScope {
  const stepNames = executionState.stepNames();
  const liveOutputs = new Map<string, unknown>();
  const clonedOutputs = new Map<string, unknown>();
  let session: Promise<ScriptSession> | undefined;
  const scope: ResolveScope = {
    stepNames,
    stepNameSet: new Set(stepNames),
    getLiveOutput(stepName) {
      if (!liveOutputs.has(stepName)) {
        liveOutputs.set(stepName, executionState.getStepOutputView(stepName));
      }
      return liveOutputs.get(stepName);
    },
    getClonedOutput(stepName) {
      if (!clonedOutputs.has(stepName)) {
        // a clone failure (cycle, BigInt, depth) is memoized too, so every token on that step pays once
        try {
          clonedOutputs.set(stepName, cloneJson(scope.getLiveOutput(stepName)));
        } catch (error) {
          clonedOutputs.set(stepName, new CloneFailure(error));
        }
      }
      const cloned = clonedOutputs.get(stepName);
      if (cloned instanceof CloneFailure) {
        throw cloned.cause;
      }
      return cloned;
    },
    getSession() {
      if (isNil(session)) {
        session = initCodeSandbox().then((sandbox) =>
          sandbox.createScriptSession(),
        );
      }
      return session;
    },
    async dispose() {
      if (isNil(session)) {
        return;
      }
      try {
        (await session).dispose();
      } catch {
        // the session failed to initialize; nothing to release
      }
    },
  };
  return scope;
}

const mergeFlattenedKeysArraysIntoOneArray = async (
  token: string,
  partsThatNeedResolving: string[],
  resolveOptions: Pick<
    ResolveInputInternalParams,
    'engineToken' | 'projectId' | 'apiUrl' | 'scope' | 'censoredInput'
  >,
) => {
  const resolvedValues: Record<string, unknown> = {};
  let longestResultLength = 0;
  for (const tokenPart of partsThatNeedResolving) {
    const variableName = tokenPart.substring(2, tokenPart.length - 2);
    resolvedValues[tokenPart] = await resolveSingleToken({
      ...resolveOptions,
      variableName,
    });
    if (Array.isArray(resolvedValues[tokenPart])) {
      longestResultLength = Math.max(
        longestResultLength,
        resolvedValues[tokenPart].length,
      );
    }
  }
  const result = new Array(longestResultLength).fill(null).map((_, index) => {
    return Object.entries(resolvedValues).reduce((acc, [tokenPart, value]) => {
      const valueToUse = (Array.isArray(value) ? value[index] : value) ?? '';
      acc = acc.replace(
        tokenPart,
        isString(valueToUse) ? valueToUse : JSON.stringify(valueToUse),
      );
      return acc;
    }, token);
  });
  return result;
};

export type PropsResolver = ReturnType<typeof createPropsResolver>;

/**
 * input: `Hello {{firstName}} {{lastName}}`
 * tokenThatNeedResolving: [`{{firstName}}`, `{{lastName}}`]
 */
async function resolveInputAsync(
  params: ResolveInputInternalParams,
): Promise<unknown> {
  const { input, scope, engineToken, projectId, apiUrl, censoredInput } =
    params;
  const tokensThatNeedResolving = input.match(VARIABLE_PATTERN);
  const inputContainsOnlyOneTokenToResolve =
    tokensThatNeedResolving !== null &&
    tokensThatNeedResolving.length === 1 &&
    tokensThatNeedResolving[0] === input;
  const resolveOptions = {
    engineToken,
    projectId,
    apiUrl,
    scope,
    censoredInput,
  };

  if (inputContainsOnlyOneTokenToResolve) {
    const trimmedInput = input.trim();
    const variableName = trimmedInput.substring(2, trimmedInput.length - 2);
    return resolveSingleToken({
      ...resolveOptions,
      variableName,
    });
  }
  const inputIncludesFlattenNestedKeysTokens = input.match(
    FLATTEN_NESTED_KEYS_PATTERN,
  );
  if (
    !isNil(inputIncludesFlattenNestedKeysTokens) &&
    !isNil(tokensThatNeedResolving)
  ) {
    return mergeFlattenedKeysArraysIntoOneArray(
      input,
      tokensThatNeedResolving,
      resolveOptions,
    );
  }

  return replaceAsync(
    input,
    VARIABLE_PATTERN,
    async (_fullMatch, variableName) => {
      const result = await resolveSingleToken({
        ...resolveOptions,
        variableName,
      });
      return isString(result) ? result : JSON.stringify(result);
    },
  );
}

async function resolveSingleToken(
  params: ResolveSingleTokenParams,
): Promise<unknown> {
  const { variableName, scope } = params;
  const isConnection = variableName.startsWith(CONNECTIONS);
  if (isConnection) {
    return handleConnection(params);
  }
  const expression = variableName.trim();
  if (expression.length === 0) {
    return '';
  }
  // Pure paths rooted at a step are read in-process; anything else (expressions, globals such as
  // `Math.PI`, blocked segments) is evaluated in the sandbox exactly as before.
  const segments = parsePropertyPath(expression);
  if (
    !isNil(segments) &&
    scope.stepNameSet.has(segments[0]) &&
    !SANDBOX_POLYFILL_GLOBALS.has(segments[0])
  ) {
    try {
      const resolution = resolvePropertyPath(
        scope.getLiveOutput(segments[0]),
        segments.slice(1),
      );
      if (resolution.status === 'resolved') {
        return resolution.value ?? '';
      }
    } catch {
      // the live walk or the JSON clone threw (host accessor such as fn.caller, BigInt, cycle, depth):
      // let the sandbox decide, which yields '' exactly as before
    }
  }
  return evalInSession(expression, scope);
}

async function evalInSession(
  expression: string,
  scope: ResolveScope,
): Promise<unknown> {
  try {
    const globals: Record<string, unknown> = {};
    for (const stepName of extractReferencedStepNames(
      expression,
      scope.stepNames,
    )) {
      const value = scope.getClonedOutput(stepName);
      // JSON drops undefined outputs, so such a step was never a global and must stay a ReferenceError
      if (value !== undefined) {
        globals[stepName] = value;
      }
    }
    const session = await scope.getSession();
    const result = await session.run(expression, globals);
    return result ?? '';
  } catch {
    return '';
  }
}

async function handleConnection(
  params: ResolveSingleTokenParams,
): Promise<unknown> {
  const { variableName, engineToken, projectId, apiUrl, censoredInput } =
    params;

  if (censoredInput) {
    return '**REDACTED**';
  }

  const connectionName = parseConnectionNameOnly(variableName);
  if (isNil(connectionName)) {
    return '';
  }

  const connection = await createConnectionService({
    engineToken,
    projectId,
    apiUrl,
  }).obtain(connectionName);
  const pathAfterConnectionName = parsePathAfterConnectionName(
    variableName,
    connectionName,
  );
  if (isNil(pathAfterConnectionName) || pathAfterConnectionName.length === 0) {
    return connection;
  }

  return evalInScope(pathAfterConnectionName, { connection });
}

function parsePathAfterConnectionName(
  variableName: string,
  connectionName: string,
): string | null {
  if (variableName.includes('[')) {
    return variableName.substring(`connections.['${connectionName}']`.length);
  }
  const cp = variableName.substring(`connections.${connectionName}`.length);
  if (cp.length === 0) {
    return cp;
  }
  return `connection${cp}`;
}

function parseConnectionNameOnly(variableName: string): string | null {
  const connectionWithNewFormatSquareBrackets = variableName.includes('[');
  if (connectionWithNewFormatSquareBrackets) {
    return parseSquareBracketConnectionPath(variableName);
  }
  // {{connections.connectionName.path}}
  // This does not work If connectionName contains .
  return variableName.split('.')?.[1];
}

function parseSquareBracketConnectionPath(variableName: string): string | null {
  const matches = variableName.match(/\['([^']+)'\]/g);
  if (matches && matches.length >= 1) {
    return matches[0].replace(/\['|'\]/g, '');
  }
  return null;
}

/**
 * Connection sub-paths keep their own throwaway sandbox run: the connection object must never be a
 * global of the shared session, where another token of the same step could read it.
 */
async function evalInScope(
  js: string,
  contextAsScope: Record<string, unknown>,
): Promise<unknown> {
  try {
    const codeSandbox = await initCodeSandbox();

    const result = await codeSandbox.runScript({
      script: js,
      scriptContext: contextAsScope,
    });
    return result ?? '';
  } catch (exception) {
    return '';
  }
}

async function replaceAsync(
  input: string,
  searchValue: RegExp,
  replacer: (...args: any[]) => Promise<string>,
): Promise<string> {
  try {
    const values: Array<Promise<string>> = [];

    input.replace(searchValue, (...args) => {
      values.push(replacer(...args));
      return '';
    });

    const resolvedValues = await Promise.all(values);

    return input.replace(searchValue, () => resolvedValues.shift() as string);
  } catch (error) {
    return Promise.reject(error);
  }
}

type ResolveSingleTokenParams = {
  variableName: string;
  scope: ResolveScope;
  engineToken: string;
  projectId: string;
  apiUrl: string;
  censoredInput: boolean;
};

type ResolveInputInternalParams = {
  input: string;
  engineToken: string;
  projectId: string;
  apiUrl: string;
  censoredInput: boolean;
  scope: ResolveScope;
};

type ResolveInputParams = {
  unresolvedInput: unknown;
  executionState: FlowExecutorContext;
};

type ResolveResult<T = unknown> = {
  resolvedInput: T;
  censoredInput: unknown;
};
