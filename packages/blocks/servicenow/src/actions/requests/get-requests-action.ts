import { createAction, Property } from '@openops/blocks-framework';
import { FilterType } from '@openops/common';
import { servicenowAuth, ServiceNowAuth } from '../../lib/auth';
import { servicenowFieldsDropdownProperty } from '../../lib/fields-dropdown-property';
import {
  extractFiltersFromProps,
  limitProperty,
  runGetRecordsAction,
} from '../action-runners';
import { createFiltersProperties } from '../create-filters-properties';
import { TABLE_NAME } from './constants';

export const getRequestsAction = createAction({
  auth: servicenowAuth,
  name: 'get_requests',
  description: 'Retrieve request items from ServiceNow with optional filters',
  displayName: 'Get Requests',
  isWriteAction: false,
  props: {
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
      refreshers: ['auth'],
      props: async ({ auth }) => {
        if (!auth) {
          return {};
        }
        return createFiltersProperties(auth as ServiceNowAuth, TABLE_NAME);
      },
    }),
    limit: limitProperty,
    fields: servicenowFieldsDropdownProperty(),
  },
  async run(context) {
    const { limit } = context.propsValue;

    const filtersProps = context.propsValue.filters?.['filters'];
    const filters = extractFiltersFromProps(filtersProps);

    const filterType =
      (context.propsValue.filterType as FilterType) || FilterType.AND;

    return runGetRecordsAction({
      auth: context.auth as ServiceNowAuth,
      tableName: TABLE_NAME,
      filters,
      filterType,
      limit: limit as number | undefined,
    });
  },
});
