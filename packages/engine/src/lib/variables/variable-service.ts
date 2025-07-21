/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BlockAuthProperty,
  BlockPropertyMap,
  ErrorMessages,
  formatErrorMessage,
  InputPropertyMap,
  PropertyType,
  StaticPropsValue,
} from '@openops/blocks-framework';
import { AUTHENTICATION_PROPERTY_NAME, isNil, isString } from '@openops/shared';
import { initCodeSandbox } from '../core/code/code-sandbox';
import { FlowExecutorContext } from '../handler/context/flow-execution-context';
import { createConnectionService } from '../services/connections.service';
import { processors } from './processors';

type VariableValidationError = {
  [key: string]: string[] | VariableValidationError;
};

export class VariableService {
  private static readonly VARIABLE_PATTERN = RegExp('\\{\\{(.*?)\\}\\}', 'g');
  private static readonly CONNECTIONS = 'connections';

  private engineToken: string;
  private projectId: string;
  private apiUrl: string;

  constructor(data: {
    engineToken: string;
    projectId: string;
    apiUrl: string;
  }) {
    this.engineToken = data.engineToken;
    this.projectId = data.projectId;
    this.apiUrl = data.apiUrl;
  }

  private async resolveInput(
    input: string,
    valuesMap: Record<string, unknown>,
    logs: boolean,
  ): Promise<unknown> {
    // If input contains only a variable token, return the value of the variable while maintaining the variable type.
    const matchedTokens = input.match(VariableService.VARIABLE_PATTERN);
    if (
      matchedTokens !== null &&
      matchedTokens.length === 1 &&
      matchedTokens[0] === input
    ) {
      const variableName = input.substring(2, input.length - 2);
      if (variableName.startsWith(VariableService.CONNECTIONS)) {
        return this.handleTypeAndResolving(variableName, logs);
      }
      return this.evalInScope(variableName, valuesMap);
    }

    return replaceAsync(
      input,
      VariableService.VARIABLE_PATTERN,
      async (_fullMatch, variableName) => {
        const result = await this.evalInScope(variableName, valuesMap);

        if (!isString(result)) {
          return JSON.stringify(result);
        }

        return result;
      },
    );
  }

  private async handleTypeAndResolving(
    path: string,
    censorConnections: boolean,
  ): Promise<unknown> {
    // Need to be resolved dynamically
    const connectionName = this.findConnectionName(path);
    if (isNil(connectionName)) {
      return '';
    }
    if (censorConnections) {
      return '**REDACTED**';
    }
    // Need to be resolved dynamically
    // Replace connection name with something that doesn't contain - or _, otherwise evalInScope would break
    const newPath = this.cleanPath(path, connectionName);

    const connection = await createConnectionService({
      engineToken: this.engineToken,
      projectId: this.projectId,
      apiUrl: this.apiUrl,
    }).obtain(connectionName);
    if (newPath.length === 0) {
      return connection;
    }
    const context: Record<string, unknown> = {};
    context.connection = connection;
    return this.evalInScope(newPath, context);
  }

  private cleanPath(path: string, connectionName: string): string {
    if (path.includes('[')) {
      return path.substring(`connections.['${connectionName}']`.length);
    }
    const cp = path.substring(`connections.${connectionName}`.length);
    if (cp.length === 0) {
      return cp;
    }
    return `connection${cp}`;
  }

  private findConnectionName(path: string): string | null {
    const paths = path.split('.');
    // Connections with square brackets
    if (path.includes('[')) {
      // Find the connection name inside {{connections['connectionName'].path}}
      const matches = path.match(/\['([^']+)'\]/g);
      if (matches && matches.length >= 1) {
        // Remove the square brackets and quotes from the connection name
        const secondPath = matches[0].replace(/\['|'\]/g, '');
        return secondPath;
      }
      return null;
    }
    return paths[1];
  }

  private async evalInScope(
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
      console.error('[evalInScope] Error evaluating variable', exception);
      return '';
    }
  }

  private async resolveInternally(
    unresolvedInput: any,
    valuesMap: any,
    logs: boolean,
  ): Promise<any> {
    if (isNil(unresolvedInput)) {
      return unresolvedInput;
    }

    if (isString(unresolvedInput)) {
      return this.resolveInput(unresolvedInput, valuesMap, logs);
    }

    if (Array.isArray(unresolvedInput)) {
      for (let i = 0; i < unresolvedInput.length; ++i) {
        unresolvedInput[i] = await this.resolveInternally(
          unresolvedInput[i],
          valuesMap,
          logs,
        );
      }
    } else if (typeof unresolvedInput === 'object') {
      const entries = Object.entries(unresolvedInput);
      for (const [key, value] of entries) {
        unresolvedInput[key] = await this.resolveInternally(
          value,
          valuesMap,
          logs,
        );
      }
    }

    return unresolvedInput;
  }
  async resolve<T = unknown>(params: {
    unresolvedInput: unknown;
    executionState: FlowExecutorContext;
  }): Promise<{
    resolvedInput: T;
    censoredInput: unknown;
  }> {
    const { unresolvedInput, executionState } = params;

    if (isNil(unresolvedInput)) {
      return {
        resolvedInput: unresolvedInput as unknown as T,
        censoredInput: unresolvedInput as unknown,
      };
    }

    const flattenedSteps = executionState.currentState();
    const resolvedInput = await this.resolveInternally(
      JSON.parse(JSON.stringify(unresolvedInput)),
      flattenedSteps,
      false,
    );
    const censoredInput = await this.resolveInternally(
      JSON.parse(JSON.stringify(unresolvedInput)),
      flattenedSteps,
      true,
    );
    return {
      resolvedInput,
      censoredInput,
    };
  }

  async applyProcessorsAndValidators(
    resolvedInput: StaticPropsValue<BlockPropertyMap>,
    props: InputPropertyMap,
    auth: BlockAuthProperty | undefined,
  ): Promise<{
    processedInput: StaticPropsValue<BlockPropertyMap>;
    errors: VariableValidationError;
  }> {
    const processedInput = { ...resolvedInput };
    const errors: VariableValidationError = {};

    const isAuthenticationProperty =
      auth &&
      (auth.type === PropertyType.CUSTOM_AUTH ||
        auth.type === PropertyType.OAUTH2) &&
      !isNil(auth.props);
    if (isAuthenticationProperty) {
      const { processedInput: authProcessedInput, errors: authErrors } =
        await this.applyProcessorsAndValidators(
          resolvedInput[AUTHENTICATION_PROPERTY_NAME] ?? {},
          auth.props,
          undefined,
        );
      processedInput.auth = authProcessedInput;
      if (Object.keys(authErrors).length > 0) {
        errors.auth = authErrors;
      }
    }

    for (const [key, value] of Object.entries(resolvedInput)) {
      const property = props[key];
      if (isNil(property)) {
        continue;
      }
      const processor = processors[property.type];
      if (processor) {
        processedInput[key] = await processor(property, value);
      }

      const shouldValidate =
        key !== AUTHENTICATION_PROPERTY_NAME &&
        property.type !== PropertyType.MARKDOWN;
      if (!shouldValidate) {
        continue;
      }
      // Short Circuit
      // If the value is required, we don't allow it to be undefined or null
      if (isNil(value) && property.required) {
        errors[key] = [
          formatErrorMessage(ErrorMessages.REQUIRED, { userInput: value }),
        ];
        continue;
      }
      // If the value is not required, we allow it to be undefined or null
      if (isNil(value) && !property.required) {
        continue;
      }

      const validators = [
        ...(property.defaultValidators ?? []),
        ...(property.validators ?? []),
      ];

      const propErrors = [];
      for (const validator of validators) {
        const error = validator.fn(property, processedInput[key], value);
        if (!isNil(error)) {
          propErrors.push(error);
        }
      }
      if (propErrors.length) errors[key] = propErrors;
    }
    return { processedInput, errors };
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

export const variableService = ({
  projectId,
  engineToken,
  apiUrl,
}: {
  projectId: string;
  engineToken: string;
  apiUrl: string;
}): VariableService => new VariableService({ projectId, engineToken, apiUrl });
