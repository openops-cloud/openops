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

    const isAuthenticationProperty =
      auth &&
      (auth.type === PropertyType.CUSTOM_AUTH ||
        auth.type === PropertyType.OAUTH2) &&
      !isNil(auth.props) &&
      requireAuth;
    if (isAuthenticationProperty) {
      const { processedInput: authProcessedInput, errors: authErrors } =
        await propsProcessor.applyProcessorsAndValidators(
          resolvedInput[AUTHENTICATION_PROPERTY_NAME],
          auth.props,
          undefined,
          requireAuth,
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

      if (property.type === PropertyType.ARRAY) {
        if (property.properties) {
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
          processedInput[key] = processedArray;
          const isThereErrors = processedErrors.some(
            (error) => Object.keys(error).length > 0,
          );
          if (isThereErrors) {
            errors[key] = {
              properties: processedErrors,
            };
          }
        } else if (typeof value === 'string') {
          processedInput[key] = tryParseJson(value);
        }
      }

      const processor = processors[property.type];
      if (processor) {
        processedInput[key] = await processor(property, processedInput[key]);
      } else if (isDropdownProperty(property.type)) {
        dropdownProcessor(key, value, property, errors, processedInput);
      }

      const shouldValidate =
        key !== AUTHENTICATION_PROPERTY_NAME &&
        property.type !== PropertyType.MARKDOWN;
      if (!shouldValidate) {
        continue;
      }

      if (isNil(value) && property.required) {
        errors[property.displayName] = [
          formatErrorMessage(ErrorMessages.REQUIRED, { userInput: value }),
        ];
      }
    }

    for (const [key, value] of Object.entries(processedInput)) {
      const property = props[key];
      if (isNil(property) || (isNil(value) && !property.required)) {
        continue;
      }

      const validationErrors = validateProperty(
        property,
        value,
        resolvedInput[key],
      );

      if (validationErrors.length > 0) {
        errors[property.displayName] = validationErrors;
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

      if (propErrors.length) {
        errors[property.displayName] = propErrors;
      }
    }

    return { processedInput, errors };
  },
};

const validateProperty = (
  property: BlockProperty,
  value: unknown,
  originalValue: unknown,
): string[] => {
  let schema;
  switch (property.type) {
    case PropertyType.SHORT_TEXT:
    case PropertyType.LONG_TEXT:
      schema = z.string({
        error: `Expected a string, received: ${originalValue}`,
      });
      break;
    case PropertyType.NUMBER:
      schema = z.number({
        error: `Expected a number, received: ${originalValue}`,
      });
      break;
    case PropertyType.CHECKBOX:
      schema = z.boolean({
        error: `Expected a boolean, received: ${originalValue}`,
      });
      break;
    case PropertyType.DATE_TIME:
      schema = z.string({
        error: `Invalid datetime format. Expected ISO format (e.g. 2024-03-14T12:00:00.000Z), received: ${originalValue}`,
      });
      break;
    case PropertyType.ARRAY:
      schema = z.array(z.any(), {
        error: `Expected an array, received: ${originalValue}`,
      });
      break;
    case PropertyType.OBJECT:
      schema = z.record(z.any(), z.any(), {
        error: `Expected an object, received: ${originalValue}`,
      });
      break;
    case PropertyType.JSON:
      schema = z.any().refine((val) => isObject(val) || Array.isArray(val), {
        message: `Expected a JSON, received: ${originalValue}`,
      });
      break;
    case PropertyType.FILE:
      schema = z.record(z.any(), z.any(), {
        error: `Expected a file url or base64 with mimeType, received: ${originalValue}`,
      });
      break;
    default:
      schema = z.any();
  }
  let finalSchema;
  if (property.required) {
    finalSchema = schema;
  } else {
    finalSchema = schema.nullable().optional();
  }

  try {
    finalSchema.parse(value);
    return [];
  } catch (err) {
    if (err instanceof z.ZodError) {
      return err.issues.map((e) => e.message);
    }
    return [];
  }
};
