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

export const getExpensesAction = createAction({
  auth: optscaleAuth,
  name: 'optscale_get_expenses',
  displayName: 'Get Resource Expenses',
  description:
    'Get per-resource expenses for a period, with owner, pool, tags and saving potential',
  isWriteAction: false,
  props: {
    organizationId: organizationProperty,
    ...dateRangeProperties,
    ...expenseFilterProperties,
    limit: Property.Number({
      displayName: 'Limit',
      description: 'The maximum number of resources to return',
      required: false,
    }),
    offset: Property.Number({
      displayName: 'Offset',
      description: 'The number of resources to skip. Requires a limit.',
      required: false,
    }),
  },
  async run(context) {
    const { organizationId, startDate, endDate, limit, offset } =
      context.propsValue;

    if (offset != null && limit == null) {
      throw new Error('Offset requires a limit');
    }

    return sendOptScaleRequest({
      auth: context.auth,
      method: HttpMethod.GET,
      path: `/organizations/${organizationId}/clean_expenses`,
      query: {
        ...toUnixDateRange(startDate, endDate),
        ...toExpenseFilterQuery(context.propsValue),
        limit,
        offset,
      },
    });
  },
});
