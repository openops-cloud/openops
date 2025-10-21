import { Property } from '@openops/blocks-framework';
import { isSingleValueFilter, ViewFilterTypesEnum } from '@openops/common';
import { logger } from '@openops/server-shared';
import { ServiceNowAuth } from '../lib/auth';
import { createFieldValueProperty } from '../lib/create-field-value-property';
import {
  getServiceNowTableFields,
  ServiceNowTableField,
} from '../lib/get-table-fields';

export async function createFiltersProperties(
  auth: ServiceNowAuth,
  tableName: string,
) {
  let tableFields: ServiceNowTableField[] = [];
  let hasError = false;

  try {
    tableFields = await getServiceNowTableFields(auth, tableName);
  } catch (error) {
    logger.error(
      `Failed to fetch ServiceNow table fields for ${tableName}:`,
      error,
    );
    hasError = true;
  }

  const fieldNameProperty = hasError
    ? Property.ShortText({
        displayName: 'Field name',
        required: true,
      })
    : Property.StaticDropdown<string>({
        displayName: 'Field name',
        required: true,
        options: {
          options: tableFields.map((f) => ({
            label: f.column_label
              ? `${f.column_label} (${f.element})`
              : f.element,
            value: f.element,
          })),
        },
      });

  return {
    filters: Property.Array({
      displayName: hasError
        ? 'Fields to filter by (Failed to load field list)'
        : 'Fields to filter by',
      required: false,
      properties: {
        fieldName: fieldNameProperty,
        filterType: Property.StaticDropdown<ViewFilterTypesEnum>({
          displayName: 'Filter type',
          required: true,
          options: {
            options: Object.keys(ViewFilterTypesEnum)
              .filter((key) => hasError || !key.startsWith('single_select_'))
              .map((key) => ({
                label:
                  ViewFilterTypesEnum[key as keyof typeof ViewFilterTypesEnum],
                value:
                  ViewFilterTypesEnum[key as keyof typeof ViewFilterTypesEnum],
              })),
          },
        }),
        value: Property.DynamicProperties({
          displayName: 'Value to search for',
          required: true,
          refreshers: hasError ? ['filterType'] : ['fieldName', 'filterType'],
          props: async ({ fieldName, filterType }) => {
            const shouldDisplayValueProperty = !isSingleValueFilter(
              filterType as unknown as ViewFilterTypesEnum,
            );

            if (!shouldDisplayValueProperty) {
              return { value: {} };
            }

            if (hasError) {
              return {
                value: Property.ShortText({
                  displayName: 'Value',
                  required: true,
                }),
              };
            }

            const currentField = fieldName as unknown as string;
            const serviceNowField = tableFields.find(
              (f) => f.element === currentField,
            );

            if (!fieldName || !serviceNowField) {
              return { value: {} };
            }

            return {
              value: await createFieldValueProperty(
                serviceNowField,
                auth,
                tableName,
                true,
              ),
            };
          },
        }),
      },
    }),
  };
}
