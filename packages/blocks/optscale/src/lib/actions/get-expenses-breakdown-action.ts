import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { optscaleAuth } from '../auth';
import { dateRangeProperties, toUnixDateRange } from '../common/date-range';
import {
  expenseFilterProperties,
  toExpenseFilterQuery,
} from '../common/expense-filters';
import { sendOptScaleRequest } from '../common/make-request';
import { organizationProperty } from '../common/properties';

export const getExpensesBreakdownAction = createAction({
  auth: optscaleAuth,
  name: 'optscale_get_expenses_breakdown',
  displayName: 'Get Expenses Breakdown',
  description:
    'Get daily expenses for a period grouped by owner, pool, data source, service, region or resource type, compared with the previous period',
  isWriteAction: false,
  props: {
    organizationId: organizationProperty,
    ...dateRangeProperties,
    breakdownBy: Property.StaticDropdown({
      displayName: 'Breakdown By',
      required: true,
      defaultValue: 'cloud_account_id',
      options: {
        options: [
          { label: 'Data source', value: 'cloud_account_id' },
          { label: 'Pool', value: 'pool_id' },
          { label: 'Owner', value: 'employee_id' },
          { label: 'Service', value: 'service_name' },
          { label: 'Region', value: 'region' },
          { label: 'Resource type', value: 'resource_type' },
          { label: 'Kubernetes node', value: 'k8s_node' },
          { label: 'Kubernetes namespace', value: 'k8s_namespace' },
          { label: 'Kubernetes service', value: 'k8s_service' },
        ],
      },
    }),
    ...expenseFilterProperties,
  },
  async run(context) {
    const { organizationId, startDate, endDate, breakdownBy } =
      context.propsValue;

    return sendOptScaleRequest({
      auth: context.auth,
      method: HttpMethod.GET,
      path: `/organizations/${organizationId}/breakdown_expenses`,
      query: {
        ...toUnixDateRange(startDate, endDate),
        breakdown_by: breakdownBy,
        ...toExpenseFilterQuery(context.propsValue),
      },
    });
  },
});
