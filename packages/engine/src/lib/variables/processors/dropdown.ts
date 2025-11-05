import {
  BlockPropertyMap,
  InputProperty,
  PropertyType,
  StaticPropsValue,
} from '@openops/blocks-framework';
import { tryParseJson } from '@openops/common';
import { PropsValidationError } from '../props-processor';

export const isDropdownProperty = (propertyType: PropertyType): boolean => {
  return (
    propertyType === PropertyType.DROPDOWN ||
    propertyType === PropertyType.STATIC_DROPDOWN ||
    propertyType === PropertyType.STATIC_MULTI_SELECT_DROPDOWN ||
    propertyType === PropertyType.MULTI_SELECT_DROPDOWN
  );
};

export const dropdownProcessor = (
  key: string,
  value: unknown,
  property: InputProperty,
  errors: PropsValidationError,
  processedInput: StaticPropsValue<BlockPropertyMap>,
): void => {
  if (
    property.type === PropertyType.STATIC_DROPDOWN &&
    typeof value === 'string' &&
    typeof property.options.options[0].value !== 'string'
  ) {
    const expectedType = typeof property.options.options[0].value;

    const parsedValue = tryParseJson(value);
    if (typeof parsedValue === expectedType) {
      processedInput[key] = parsedValue;
    } else {
      errors[property.displayName] = [
        `Expected an ${expectedType}, received: ${value}`,
      ];
    }
  }

  if (property.type == PropertyType.DROPDOWN && typeof value === 'string') {
    const parsedValue = tryParseJson(value);
    processedInput[key] = parsedValue;
  }

  if (
    (property.type === PropertyType.STATIC_MULTI_SELECT_DROPDOWN ||
      property.type === PropertyType.MULTI_SELECT_DROPDOWN) &&
    typeof value === 'string'
  ) {
    const parsedValue = tryParseJson(value);
    if (Array.isArray(parsedValue)) {
      processedInput[key] = parsedValue;
    } else {
      errors[property.displayName] = [`Expected an array, received: ${value}`];
    }
  }
};
