import { createAction, Property } from '@openops/blocks-framework';
import { getRegionsDropdownState, regionsStaticMultiSelectDropdown } from '@openops/common';
import { nopsAuth } from '../auth';
import { makeGetRequest } from '../common/http-client';

export const getCostSummaryAction = createAction({
  name: 'nops_get_cost_summary',
  displayName: 'Get Cost Summary',
  description: 'Retrieve cost summary data with optional filters',
  auth: nopsAuth,
  props: {
    signature: Property.SecretText({
      displayName: 'Signature (optional)',
      description:
        'If your API key requires signatures, paste the generated base64 signature here. It will be sent as x-nops-signature.',
      required: false,
    }),
    dateStart: Property.ShortText({
      displayName: 'Start Date',
      description: 'Start date for cost data. Format: YYYY-MM-DD',
      required: false,
    }),
    dateEnd: Property.ShortText({
      displayName: 'End Date',
      description: 'End date for cost data. Format: YYYY-MM-DD',
      required: false,
    }),
    costType: Property.StaticDropdown({
      displayName: 'Cost Type',
      description: 'Cost field to use',
      required: false,
      options: {
        options: [
          {
            label: 'Unblended Cost',
            value: 'line_item_unblended_cost',
          },
          {
            label: 'Amortized Cost',
            value: 'line_item_amortized_cost',
          },
          {
            label: 'Blended Cost',
            value: 'line_item_blended_cost',
          },
        ],
      },
    }),
    nonResources: Property.StaticDropdown({
      displayName: 'Resource Filter',
      description: 'Filter by resource type',
      required: false,
      options: {
        options: [
          { label: 'All (Resources and Non-Resources)', value: '' },
          { label: 'Resources Only', value: 'false' },
          { label: 'Non-Resources Only', value: 'true' },
        ],
      },
    }),
    accountIds: Property.Array({
      displayName: 'Account IDs',
      description: 'Filter by account IDs (supports multiple values)',
      required: false,
    }),
    regions: regionsStaticMultiSelectDropdown(false).regions,
    products: Property.Array({
      displayName: 'Products',
      description: 'Filter by products (supports multiple values)',
      required: false,
    }),
    tags: Property.Json({
      displayName: 'Tags',
      description:
        'Filter by tag key+value pairs. Example: {"App": "web", "Environment": "prod"}',
      required: false,
    }),
    excludeAccountIds: Property.Array({
      displayName: 'Exclude Account IDs',
      description: 'Exclude specific account IDs (supports multiple values)',
      required: false,
    }),
    excludeRegions: Property.StaticMultiSelectDropdown({
      displayName: 'Exclude Regions',
      description: 'Exclude specific AWS regions (supports multiple values)',
      required: false,
      options: getRegionsDropdownState(),
    }),
    excludeProducts: Property.Array({
      displayName: 'Exclude Products',
      description: 'Exclude specific products (supports multiple values)',
      required: false,
    }),
    excludeTags: Property.Json({
      displayName: 'Exclude Tags',
      description:
        'Exclude tag key+value pairs. Example: {"App": "test", "Environment": "dev"}',
      required: false,
    }),
  },
  async run(context) {
    const {
      dateStart,
      dateEnd,
      costType,
      nonResources,
      accountIds,
      regions,
      products,
      tags,
      excludeAccountIds,
      excludeRegions,
      excludeProducts,
      excludeTags,
    } = context.propsValue;

    const queryParams: Record<string, any> = {};

    if (dateStart) {
      queryParams['date_start'] = dateStart as string;
    }

    if (dateEnd) {
      queryParams['date_end'] = dateEnd as string;
    }

    if (costType) {
      queryParams['cost_type'] = costType as string;
    }

    if (nonResources) {
      queryParams['non_resources'] = nonResources as string;
    }

    // Include filters
    if (accountIds && accountIds.length > 0) {
      queryParams['account_id'] = accountIds as string[];
    }

    if (regions && regions.length > 0) {
      queryParams['region'] = regions as string[];
    }

    if (products && products.length > 0) {
      queryParams['product'] = products as string[];
    }

    if (tags) {
      queryParams['tag'] = JSON.stringify(tags);
    }

    // Exclude filters
    if (excludeAccountIds && excludeAccountIds.length > 0) {
      queryParams['exclude_account_id'] = excludeAccountIds as string[];
    }

    if (excludeRegions && excludeRegions.length > 0) {
      queryParams['exclude_region'] = excludeRegions as string[];
    }

    if (excludeProducts && excludeProducts.length > 0) {
      queryParams['exclude_product'] = excludeProducts as string[];
    }

    if (excludeTags) {
      queryParams['exclude_tag'] = JSON.stringify(excludeTags);
    }

    const response = await makeGetRequest(
      context.auth as string,
      '/c/cost_page/cost_summary/',
      queryParams,
      context.propsValue.signature
        ? { 'x-nops-signature': String(context.propsValue.signature) }
        : undefined,
    );

    return response.body;
  },
});

