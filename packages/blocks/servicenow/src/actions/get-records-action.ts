import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property, Validators } from '@openops/blocks-framework';
import { FilterType, ViewFilterTypesEnum } from '@openops/common';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { buildServiceNowApiUrl } from '../lib/build-api-url';
import { servicenowFieldsDropdownProperty } from '../lib/fields-dropdown-property';
import { buildServiceNowQuery } from '../lib/filter-to-query';
import { generateAuthHeader } from '../lib/generate-auth-header';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';
import { createFiltersProperties } from './create-filters-properties';

export const getRecordsAction = createAction({
  auth: servicenowAuth,
  name: 'get_records',
  description: 'Retrieve records from a specified user table',
  displayName: 'Get Records',
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
        return createFiltersProperties(
          auth as ServiceNowAuth,
          tableName as unknown as string,
        );
      },
    }),
    limit: Property.Number({
      displayName: 'Limit',
      description: 'Maximum number of records to return. Default is 10000.',
      required: true,
      defaultValue: 10000,
      validators: [Validators.minValue(1)],
    }),
    fields: servicenowFieldsDropdownProperty(),
  },
  async run(context) {
    const auth = context.auth as ServiceNowAuth;
    const { tableName, limit, fields } = context.propsValue;

    const queryParams: Record<string, string> = {};

    const filtersProps = context.propsValue.filters['filters'] as unknown as
      | {
          fieldName: string;
          value: { value: unknown };
          filterType: ViewFilterTypesEnum;
        }[]
      | undefined;

    if (filtersProps?.length) {
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

    const selectedFields = (fields as { selected?: string[] })?.selected;

    if (Array.isArray(selectedFields)) {
      queryParams['sysparm_fields'] = selectedFields.join(',');
    }

    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: buildServiceNowApiUrl(auth, tableName as string),
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
