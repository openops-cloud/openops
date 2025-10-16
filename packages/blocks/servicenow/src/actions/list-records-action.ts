import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import {
  FilterType,
  isSingleValueFilter,
  ViewFilterTypesEnum,
} from '@openops/common';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { createFieldValueProperty } from '../lib/create-field-value-property';
import { servicenowFieldsDropdownProperty } from '../lib/fields-dropdown-property';
import { buildServiceNowQuery } from '../lib/filter-to-query';
import { generateAuthHeader } from '../lib/generate-auth-header';
import { getServiceNowTableFields } from '../lib/get-table-fields';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';

export const listRecordsAction = createAction({
  auth: servicenowAuth,
  name: 'list_records',
  description: 'List records from a ServiceNow table with optional filters.',
  displayName: 'List Records',
  isWriteAction: false,
  props: {
    tableName: servicenowTableDropdownProperty(),
    filterType: Property.StaticDropdown({
      displayName: 'Filter type',
      required: false,
      options: {
        options: [
          {
            label: 'Match all filters',
            value: FilterType.AND,
          },
          {
            label: 'Match any filter',
            value: FilterType.OR,
          },
        ],
      },
      defaultValue: FilterType.AND,
    }),
    filters: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['auth', 'tableName'],
      props: async ({ auth, tableName }) => {
        if (!auth || !tableName) {
          return {};
        }

        const properties: { [key: string]: any } = {};

        try {
          const tableFields = await getServiceNowTableFields(
            auth as ServiceNowAuth,
            tableName as unknown as string,
          );

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
                        ViewFilterTypesEnum[
                          key as keyof typeof ViewFilterTypesEnum
                        ],
                      value:
                        ViewFilterTypesEnum[
                          key as keyof typeof ViewFilterTypesEnum
                        ],
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
                    auth as ServiceNowAuth,
                    tableName as unknown as string,
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
                      ViewFilterTypesEnum[
                        key as keyof typeof ViewFilterTypesEnum
                      ],
                    value:
                      ViewFilterTypesEnum[
                        key as keyof typeof ViewFilterTypesEnum
                      ],
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
      },
    }),
    limit: Property.Number({
      displayName: 'Limit',
      description: 'Maximum number of records to return. Default is 100.',
      required: false,
      defaultValue: 100,
    }),
    fields: servicenowFieldsDropdownProperty(),
  },
  async run(context) {
    const auth = context.auth as ServiceNowAuth;
    const { tableName, limit, fields } = context.propsValue;

    const queryParams: Record<string, string> = {};

    const filtersProps = context.propsValue.filters['filters'] as unknown as {
      fieldName: string;
      value: { value: unknown };
      filterType: ViewFilterTypesEnum;
    }[];

    if (filtersProps && filtersProps.length > 0) {
      const filters = filtersProps.map((filter) => ({
        fieldName: filter.fieldName,
        value: filter.value['value'],
        filterType: filter.filterType,
      }));

      const filterType =
        (context.propsValue.filterType as FilterType) || FilterType.AND;
      const query = buildServiceNowQuery(filters, filterType);

      if (query) {
        queryParams['sysparm_query'] = query;
      }
    }

    if (limit !== undefined && limit !== null) {
      queryParams['sysparm_limit'] = String(limit);
    }

    if (fields && Array.isArray(fields) && fields.length > 0) {
      queryParams['sysparm_fields'] = fields.join(',');
    }

    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `https://${auth.instanceName}.service-now.com/api/now/table/${tableName}`,
      headers: {
        ...generateAuthHeader({
          username: auth.username,
          password: auth.password,
        }),
        Accept: 'application/json',
      },
      queryParams,
    });

    return response.body;
  },
});
