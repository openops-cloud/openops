import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { FilterType, ViewFilterTypesEnum } from '@openops/common';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { buildServiceNowApiUrl } from '../lib/build-api-url';
import { servicenowFieldsDropdownProperty } from '../lib/fields-dropdown-property';
import { buildServiceNowQuery } from '../lib/filter-to-query';
import { generateAuthHeader } from '../lib/generate-auth-header';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';
import { createFiltersProperties } from './create-filters-properties';

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
        return createFiltersProperties(
          auth as ServiceNowAuth,
          tableName as unknown as string,
        );
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
