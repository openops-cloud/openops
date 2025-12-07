import {
  BlockAuthProperty,
  BlockProperty,
  BlockPropertyMap,
  ErrorMessages,
  formatErrorMessage,
  InputPropertyMap,
  PropertyType,
  StaticPropsValue,
} from '@openops/blocks-framework';
import { tryParseJson } from '@openops/common';
import { AUTHENTICATION_PROPERTY_NAME, isNil, isObject } from '@openops/shared';
import { z } from 'zod';
import { processors } from './processors';
import { arrayZipperProcessor } from './processors/array-zipper';
import { dropdownProcessor, isDropdownProperty } from './processors/dropdown';

export type PropsValidationError = {
  [key: string]: string[] | PropsValidationError | PropsValidationError[];
};

type ProcessingContext = {
  readonly resolvedInput: StaticPropsValue<BlockPropertyMap>;
  readonly props: InputPropertyMap;
  processedInput: StaticPropsValue<BlockPropertyMap>;
  errors: PropsValidationError;
};

async function handleAuthentication(
  resolvedInput: StaticPropsValue<BlockPropertyMap>,
  auth: BlockAuthProperty | undefined,
  requireAuth: boolean,
): Promise<{
  processedAuth: StaticPropsValue<BlockPropertyMap> | undefined;
  authErrors: PropsValidationError | undefined;
}> {
  const shouldProcessAuth =
    auth &&
    (auth.type === PropertyType.CUSTOM_AUTH ||
      auth.type === PropertyType.OAUTH2) &&
    !isNil(auth.props) &&
    requireAuth;

  if (!shouldProcessAuth) {
    return { processedAuth: undefined, authErrors: undefined };
  }

  const { processedInput: authProcessedInput, errors: authErrors } =
    await propsProcessor.applyProcessorsAndValidators(
      resolvedInput[AUTHENTICATION_PROPERTY_NAME] ?? {},
      auth.props,
      undefined,
      requireAuth,
    );

  return {
    processedAuth: authProcessedInput,
    authErrors: Object.keys(authErrors).length > 0 ? authErrors : undefined,
  };
}

async function handleArrayProperty(
  key: string,
  value: unknown,
  property: BlockProperty,
): Promise<{
  processedArray: unknown[];
  arrayErrors: PropsValidationError | undefined;
}> {
  if (!('properties' in property) || !property.properties) {
    if (typeof value === 'string') {
      const parsed = tryParseJson(value);

      return {
        processedArray: Array.isArray(parsed) ? parsed : [],
        arrayErrors: undefined,
      };
    }
    return { processedArray: value as unknown[], arrayErrors: undefined };
  }

  const arrayOfObjects = arrayZipperProcessor(property, value);
  const processedArray = [];
  const processedErrors = [];

  for (const item of arrayOfObjects) {
    const { processedInput: itemProcessedInput, errors: itemErrors } =
      await propsProcessor.applyProcessorsAndValidators(
        item,
        property.properties,
        undefined,
        false,
      );
    processedArray.push(itemProcessedInput);
    processedErrors.push(itemErrors);
  }

  const hasErrors = processedErrors.some(
    (error) => Object.keys(error).length > 0,
  );
  const arrayErrors = hasErrors ? { properties: processedErrors } : undefined;

  return { processedArray, arrayErrors };
}

function validateRequiredField(
  key: string,
  value: unknown,
  property: BlockProperty,
): string[] | null {
  const shouldSkipValidation =
    key === AUTHENTICATION_PROPERTY_NAME ||
    property.type === PropertyType.MARKDOWN;

  if (shouldSkipValidation) {
    return null;
  }

  if (isNil(value) && property.required) {
    return [formatErrorMessage(ErrorMessages.REQUIRED, { userInput: value })];
  }

  return null;
}

function getSchemaForType(
  property: BlockProperty,
  userInput: unknown,
): z.ZodSchema {
  const schemaMap: Partial<Record<PropertyType, z.ZodSchema>> = {
    [PropertyType.SHORT_TEXT]: z.string({
      error: `Expected a string, received: ${userInput}`,
    }),
    [PropertyType.LONG_TEXT]: z.string({
      error: `Expected a string, received: ${userInput}`,
    }),
    [PropertyType.NUMBER]: z.number({
      error: `Expected a number, received: ${userInput}`,
    }),
    [PropertyType.CHECKBOX]: z.boolean({
      error: `Expected a boolean, received: ${userInput}`,
    }),
    [PropertyType.DATE_TIME]: z.string({
      error: `Invalid datetime format. Expected ISO format (e.g. 2024-03-14T12:00:00.000Z), received: ${userInput}`,
    }),
    [PropertyType.ARRAY]: z.array(z.any(), {
      error: `Expected an array, received: ${userInput}`,
    }),
    [PropertyType.OBJECT]: z.record(z.any(), z.any(), {
      error: `Expected an object, received: ${userInput}`,
    }),
    [PropertyType.JSON]: z
      .any()
      .refine((val) => isObject(val) || Array.isArray(val), {
        message: `Expected a JSON, received: ${userInput}`,
      }),
    [PropertyType.FILE]: z.record(z.any(), z.any(), {
      error: `Expected a file url or base64 with mimeType, received: ${userInput}`,
    }),
  };

  const schema = schemaMap[property.type] ?? z.any();

  return property.required ? schema : schema.nullable().optional();
}

function executeCustomValidators(
  property: BlockProperty,
  processedValue: unknown,
  originalValue: unknown,
): string[] {
  const validators = [
    ...(property.defaultValidators ?? []),
    ...(property.validators ?? []),
  ];

  const errors: string[] = [];
  for (const validator of validators) {
    const error = validator.fn(property, processedValue, originalValue);
    if (!isNil(error)) {
      errors.push(error);
    }
  }

  return errors;
}

async function processInputProperties(
  context: ProcessingContext,
): Promise<void> {
  for (const [key, value] of Object.entries(context.resolvedInput)) {
    const property = context.props[key];
    if (isNil(property)) {
      continue;
    }

    if (property.type === PropertyType.ARRAY) {
      const { processedArray, arrayErrors } = await handleArrayProperty(
        key,
        value,
        property,
      );
      context.processedInput[key] = processedArray;
      if (arrayErrors) {
        context.errors[key] = arrayErrors;
      }
      continue;
    }

    const processor = processors[property.type];
    if (processor) {
      context.processedInput[key] = await processor(property, value);
    } else if (isDropdownProperty(property.type)) {
      dropdownProcessor(
        key,
        value,
        property,
        context.errors,
        context.processedInput,
      );
    } else {
      context.processedInput[key] = value;
    }

    const requiredError = validateRequiredField(key, value, property);
    if (requiredError) {
      context.errors[property.displayName] = requiredError;
    }
  }
}

export const propsProcessor = {
  applyProcessorsAndValidators: async (
    resolvedInput: StaticPropsValue<BlockPropertyMap>,
    props: InputPropertyMap,
    auth: BlockAuthProperty | undefined,
    requireAuth: boolean,
  ): Promise<{
    processedInput: StaticPropsValue<BlockPropertyMap>;
    errors: PropsValidationError;
  }> => {
    const processedInput = { ...resolvedInput };
    const errors: PropsValidationError = {};

    const { processedAuth, authErrors } = await handleAuthentication(
      resolvedInput,
      auth,
      requireAuth,
    );
    if (processedAuth) {
      processedInput.auth = processedAuth;
    }
    if (authErrors) {
      errors.auth = authErrors;
    }

    await processInputProperties({
      resolvedInput,
      props,
      processedInput,
      errors,
    });

    for (const [key, value] of Object.entries(processedInput)) {
      const property = props[key];
      if (isNil(property) || (isNil(value) && !property.required)) {
        continue;
      }

      const schema = getSchemaForType(property, resolvedInput[key]);
      try {
        schema.parse(value);
      } catch (err) {
        if (err instanceof z.ZodError) {
          errors[property.displayName] = err.issues.map((e) => e.message);
          continue;
        }
      }

      const validatorErrors = executeCustomValidators(
        property,
        processedInput[key],
        resolvedInput[key],
      );
      if (validatorErrors.length > 0) {
        errors[property.displayName] = validatorErrors;
      }
    }

    return { processedInput, errors };
  },
};
