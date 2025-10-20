import { Property } from '@openops/blocks-framework';
import { isSingleValueFilter, ViewFilterTypesEnum } from '@openops/common';
import { ServiceNowAuth } from '../lib/auth';
import { createFieldValueProperty } from '../lib/create-field-value-property';
import { getServiceNowTableFields } from '../lib/get-table-fields';

export async function createFiltersProperties(
  auth: ServiceNowAuth,
  tableName: string,
) {
  const properties: { [key: string]: any } = {};

  try {
    const tableFields = await getServiceNowTableFields(auth, tableName);

    properties['filters'] = Property.Array({
      displayName: 'Fields to filter by',
      required: false,
      properties: {
        fieldName: Property.StaticDropdown<string>({
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
        }),
        filterType: Property.StaticDropdown<ViewFilterTypesEnum>({
          displayName: 'Filter type',
          required: true,
          options: {
            options: Object.keys(ViewFilterTypesEnum)
              .filter((key) => !key.startsWith('single_select_'))
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
          refreshers: ['fieldName', 'filterType'],
          props: async ({ fieldName, filterType }) => {
            const shouldDisplayValueProperty =
              fieldName &&
              !isSingleValueFilter(
                filterType as unknown as ViewFilterTypesEnum,
              );
            const currentField = fieldName as unknown as string;
            const serviceNowField = tableFields.find(
              (f) => f.element === currentField,
            );

            const innerProps: { [key: string]: any } = {};

            if (!shouldDisplayValueProperty || !serviceNowField) {
              innerProps['value'] = {};
              return innerProps;
            }

            innerProps['value'] = await createFieldValueProperty(
              serviceNowField,
              auth,
              tableName,
              true,
            );

            return innerProps;
          },
        }),
      },
    });
  } catch (error) {
    properties['filters'] = Property.Array({
      displayName: 'Fields to filter by',
      required: false,
      properties: {
        fieldName: Property.ShortText({
          displayName: 'Field name',
          required: true,
        }),
        filterType: Property.StaticDropdown<ViewFilterTypesEnum>({
          displayName: 'Filter type',
          required: true,
          options: {
            options: Object.keys(ViewFilterTypesEnum).map((key) => ({
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
          refreshers: ['filterType'],
          props: async ({ filterType }) => {
            const shouldDisplayValueProperty = !isSingleValueFilter(
              filterType as unknown as ViewFilterTypesEnum,
            );

            const innerProps: { [key: string]: any } = {
              value: shouldDisplayValueProperty
                ? Property.ShortText({
                    displayName: 'Value',
                    required: true,
                  })
                : {},
            };

            return innerProps;
          },
        }),
      },
    });
  }

  return properties;
}
