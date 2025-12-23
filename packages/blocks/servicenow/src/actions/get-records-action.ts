import { createAction, Property } from '@openops/blocks-framework';
import { FilterType } from '@openops/common';
import { servicenowAuth, ServiceNowAuth } from '../lib/auth';
import { servicenowFieldsDropdownProperty } from '../lib/fields-dropdown-property';
import { servicenowTableDropdownProperty } from '../lib/table-dropdown-property';
import {
  extractFiltersFromProps,
  limitProperty,
  runGetRecordsAction,
} from './action-runners';
import { createFiltersProperties } from './create-filters-properties';

export const getRecordsAction = createAction({
  auth: servicenowAuth,
  name: 'get_records',
  description: 'Get records from a specified user table',
  displayName: 'Get Records',
  isWriteAction: false,
  props: {
    tableName: servicenowTableDropdownProperty(),
    filterType: Property.StaticDropdown({
      displayName: 'Filter Type',
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
    limit: limitProperty,
    fields: servicenowFieldsDropdownProperty(),
  },
  async run(context) {
    const { tableName, limit, fields } = context.propsValue;

    const filtersProps = context.propsValue.filters?.['filters'];
    const filters = extractFiltersFromProps(filtersProps);

    const filterType =
      (context.propsValue.filterType as FilterType) || FilterType.AND;

    const selectedFields = (fields as { selected?: string[] })?.selected;

    return runGetRecordsAction({
      auth: context.auth as ServiceNowAuth,
      tableName: tableName as string,
      filters,
      filterType,
      limit: limit as number | undefined,
      fields: selectedFields,
    });
  },
});
