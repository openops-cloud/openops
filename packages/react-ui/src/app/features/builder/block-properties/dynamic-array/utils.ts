import { ArrayPropsState } from '@/app/features/builder/block-properties/dynamic-array/array-properties-context';
import {
  ArrayPropertiesWithRefreshers,
  DynamicArrayProperties,
} from '@/app/features/builder/block-properties/dynamic-array/types';
import { ArrayProperty } from '@openops/blocks-framework';
import { isNil } from '@openops/shared';

export const enhanceDynamicProperties = (
  arrayProperty: ArrayProperty<boolean>,
) => {
  const properties = arrayProperty.properties || {};
  const propertiesEntries = Object.entries(properties);

  return propertiesEntries
    .map(([propertyName, property]) => {
      if (!isPropertyWithRefreshers(property)) {
        return {
          [propertyName]: property,
        };
      }

      // another property is registered as a refresher for this property
      const isDynamic = !!property.refreshers.find((r) => !!properties[r]);

      return {
        [propertyName]: {
          ...property,
          isDynamic,
          refreshFieldAttributes: property.refreshers || [],
        },
      };
    })
    .reduce(
      (acc, prop) => ({
        ...acc,
        ...prop,
      }),
      {} as Record<string, DynamicArrayProperties>,
    );
};

export const getDynamicInput = (
  propertyName: string,
  inputName: string,
  arrayContext: ArrayPropsState | undefined,
  settings: any,
) => {
  let dynamicPropertyName;
  let dynamicInput;

  const dynamicProps = Object.entries(arrayContext?.properties?.dynamic || {})
    .filter(([, prop]) => isDynamicProperty(prop))
    .reduce(
      (acc, [key, prop]) => {
        acc[key] = prop;
        return acc;
      },
      {} as Record<string, any>,
    );

  if (Object.keys(dynamicProps).includes(propertyName)) {
    const index = extractIndex(inputName) ?? 0;
    const fields = arrayContext?.properties?.fields || [];
    const fieldGroup = fields[index] as Record<string, any> | undefined;

    const dynamicProp = dynamicProps[propertyName];
    dynamicPropertyName = arrayContext?.parentPropertyKey?.includes('.')
      ? arrayContext.parentPropertyKey.split('.')[0]
      : arrayContext?.parentPropertyKey || '';

    const attributeKeys: string[] = dynamicProp?.refreshFieldAttributes || [];

    const extraInputProperties = attributeKeys.reduce(
      (acc: Record<string, any>, key) => ({
        ...acc,
        [key]: fieldGroup?.[key] || '',
      }),
      {} as Record<string, any>,
    );

    dynamicInput = {
      ...settings.input,
      propertyName,
      ...extraInputProperties,
    };

    if (dynamicInput[dynamicPropertyName]) {
      dynamicInput[dynamicPropertyName] = undefined;
    }
  }
  return { dynamicPropertyName, dynamicInput };
};

type DynamicRefresherInput = `settings.input.${string}`;

export const getDynamicRefreshers = (
  dynamicProperties: Record<string, DynamicArrayProperties>,
  propertyName: string,
  inputName: string,
  isDynamic: boolean,
): DynamicRefresherInput[] => {
  if (!isDynamic || !inputName || !dynamicProperties[propertyName]) {
    return [];
  }

  const prop = dynamicProperties[propertyName];
  const attributes = prop.refreshFieldAttributes;

  if (Array.isArray(attributes) && attributes.length > 0) {
    return attributes.map((a) => {
      return inputName.replace(
        `.${propertyName}`,
        `.${a}`,
      ) as DynamicRefresherInput;
    });
  }

  return [];
};

export const mapRefreshersToDynamic = (
  refreshers: string[],
  property: DynamicArrayProperties | undefined,
  dynamicProperties: Record<string, DynamicArrayProperties>,
  propertyName: string,
  inputName: string,
) => {
  return refreshers
    .map((refresher) => {
      const dynamicRefreshers = getDynamicRefreshers(
        dynamicProperties,
        propertyName,
        inputName || '',
        isDynamicProperty(property),
      );

      const inputsToWatch: `settings.input.${string}`[] =
        dynamicRefreshers.length > 0
          ? dynamicRefreshers
          : [`settings.input.${refresher}`];

      return inputsToWatch;
    })
    .flat();
};

export const isSimpleArray = (array: ArrayProperty<boolean>) =>
  isNil(array.properties);

export function isDynamicProperty(
  property: any = {},
): property is { isDynamic: true; refreshFieldAttribute: string } {
  return !!property.isDynamic;
}

function isPropertyWithRefreshers(
  property: any = {},
): property is ArrayPropertiesWithRefreshers {
  return Array.isArray(property.refreshers) && property.refreshers?.length > 0;
}

export const extractIndex = (input?: string): number | null => {
  if (!input) return null;

  const regex = /\d+/;
  const match = input.match(regex);
  return match ? parseInt(match[0], 10) : null;
};
