import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { cloudfixAuth, CloudfixAuth } from '../common/auth';
import { makeRequest } from '../common/make-request';

export const getRecommendationsAction = createAction({
  name: 'get_recommendations',
  displayName: 'Get Recommendations',
  description: 'Get recommendations with filtering',
  auth: cloudfixAuth,
  IsWriteAction: false,
  props: {
    status: Property.StaticMultiSelectDropdown({
      displayName: 'Status filter',
      description: 'Filter recommendations by status',
      required: false,
      options: {
        options: [
          { label: 'Suggested', value: 'SUGGESTED' },
          { label: 'Scheduled', value: 'SCHEDULED' },
          { label: 'Failed', value: 'FAILED' },
          { label: 'Completed', value: 'COMPLETED' },
          { label: 'Rejected', value: 'REJECTED' },
          { label: 'In Progress', value: 'IN_PROGRESS' },
          {
            label: 'Ready',
            value: 'MANUAL_APPROVAL',
          },
          {
            label: 'No Longer Applicable',
            value: 'NO_LONGER_APPLICABLE',
          },
          {
            label: 'Resource Deleted',
            value: 'RESOURCE_DELETED',
          },
          {
            label: 'Resource Fixed',
            value: 'RESOURCE_FIXED',
          },
          {
            label: 'Manually Fixed',
            value: 'MANUALLY_FIXED',
          },
        ],
      },
    }),
    sortBy: Property.StaticDropdown({
      displayName: 'Sort by',
      description: 'The field to sort the recommendations by',
      required: false,
      options: {
        options: [
          { label: 'Scheduled At', value: 'scheduledAt' },
          { label: 'Updated At', value: 'updatedAt' },
          { label: 'Annual Savings', value: 'annualSavings' },
          { label: 'Annual Cost', value: 'annualCost' },
        ],
      },
      defaultValue: 'scheduledAt',
    }),
    sortOrder: Property.StaticDropdown({
      displayName: 'Sort order',
      description: 'The order to sort the recommendations',
      required: false,
      options: {
        options: [
          { label: 'Descending', value: 'DESC' },
          { label: 'Ascending', value: 'ASC' },
        ],
      },
      defaultValue: 'DESC',
    }),
    includeParameters: Property.Checkbox({
      displayName: 'Include parameters',
      description: 'Whether to include parameters in the response',
      required: false,
    }),
    finderFixerId: Property.ShortText({
      displayName: 'Finder fixer ID',
      description: 'The ID of the finder fixer',
      required: false,
    }),
    pageNumber: Property.Number({
      displayName: 'Page number',
      description: 'The page number for pagination (starts from 1)',
      required: false,
      defaultValue: 1,
    }),
    pageLimit: Property.Number({
      displayName: 'Page limit',
      description: 'The maximum number of recommendations per page',
      required: false,
      defaultValue: 200,
    }),
  },
  async run(context) {
    const {
      finderFixerId,
      pageNumber,
      pageLimit,
      sortBy,
      sortOrder,
      includeParameters,
      status,
    } = context.propsValue;

    const queryParams: Record<string, string | string[] | number | boolean> =
      {};

    if (finderFixerId) {
      queryParams['finderFixerId'] = finderFixerId;
    }

    if (pageNumber) {
      queryParams['pageNumber'] = pageNumber;
    }

    if (pageLimit) {
      queryParams['pageLimit'] = pageLimit;
    }

    if (sortBy) {
      queryParams['sortBy'] = sortBy;
    }

    if (sortOrder) {
      queryParams['sortOrder'] = sortOrder;
    }

    if (includeParameters !== undefined) {
      queryParams['includeParameters'] = includeParameters;
    }

    if (status && status.length > 0) {
      queryParams['status'] = status;
    }

    const response = await makeRequest({
      auth: context.auth as CloudfixAuth,
      endpoint: '/recommendations',
      method: HttpMethod.GET,
      queryParams,
    });

    return response;
  },
});
