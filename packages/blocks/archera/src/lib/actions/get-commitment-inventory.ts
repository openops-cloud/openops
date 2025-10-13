import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { archeraAuth } from '../../auth';

export const getCommitmentsInventoryAction = createAction({
  auth: archeraAuth,
  name: 'archera_get_commitments_inventory',
  description: 'Get commitment inventory for a provider within a date range',
  displayName: 'Get Commitments Inventory',
  isWriteAction: false,
  props: {
    provider: Property.StaticDropdown({
      displayName: 'Provider',
      description: 'The cloud provider to fetch commitments for.',
      required: true,
      options: {
        options: [
          { label: 'AWS', value: 'aws' },
          { label: 'Azure', value: 'azure' },
          { label: 'GCP', value: 'gcp' },
          { label: 'Kubernetes', value: 'kubernetes' },
          { label: 'Unknown', value: 'unknown' },
        ],
      },
    }),
    startDate: Property.ShortText({
      displayName: 'Start Date',
      description:
        'The start date for the commitment inventory query (Format: yyyy-MM-dd).',
      required: true,
    }),
    endDate: Property.ShortText({
      displayName: 'End Date',
      description:
        'The end date for the commitment inventory query (Format: yyyy-MM-dd).',
      required: true,
    }),
    search: Property.ShortText({
      displayName: 'Search',
      description: 'Search term to filter commitments.',
      required: false,
    }),
    orderBy: Property.StaticDropdown({
      displayName: 'Order By',
      description: 'Field to order results by.',
      required: false,
      options: {
        options: [
          { label: 'End Date', value: 'end_date' },
          { label: 'Duration (seconds)', value: 'duration_seconds' },
          { label: 'Start Date', value: 'start_date' },
          { label: 'Upfront Cost', value: 'upfront_cost' },
          { label: 'Amortized Cost', value: 'amortized_cost' },
          { label: 'Recurring Cost', value: 'recurring_cost' },
          { label: 'Created At', value: 'created_at' },
          { label: 'Updated At', value: 'updated_at' },
          { label: 'Is Leased', value: 'is_leased' },
          { label: 'Account ID', value: 'account_id' },
          { label: 'Type', value: 'type' },
          { label: 'Status', value: 'status' },
          { label: 'Scope', value: 'scope' },
          { label: 'Reservation End', value: 'reservation_end' },
          { label: 'Utilization', value: 'utilization' },
          { label: 'Monthly Savings', value: 'monthly_savings' },
        ],
      },
    }),
    desc: Property.Checkbox({
      displayName: 'Descending Order',
      description: 'Sort in descending order.',
      required: false,
      defaultValue: true,
    }),
    page: Property.Number({
      displayName: 'Page',
      description: 'Page number for pagination.',
      required: false,
      defaultValue: 1,
    }),
    pageSize: Property.Number({
      displayName: 'Page Size',
      description: 'Number of items per page (1-10000).',
      required: false,
      defaultValue: 10,
    }),
  },
  async run(context) {
    const queryParams: Record<string, any> = {
      provider: context.propsValue.provider,
      start_date: context.propsValue.startDate,
      end_date: context.propsValue.endDate,
      desc: context.propsValue.desc,
      page: context.propsValue.page,
      page_size: context.propsValue.pageSize,
    };

    if (context.propsValue.search) {
      queryParams['search'] = context.propsValue.search;
    }

    if (context.propsValue.orderBy) {
      queryParams['order_by'] = context.propsValue.orderBy;
    }

    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `https://api.archera.ai/v1/org/${context.auth.orgId}/commitments`,
      headers: {
        'x-api-key': context.auth.apiToken,
      },
      queryParams,
    });

    return response.body;
  },
});
