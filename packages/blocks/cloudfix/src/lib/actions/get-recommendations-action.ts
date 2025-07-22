import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { cloudfixAuth, CloudfixAuth } from '../common/auth';
import { makeRequest } from '../common/make-request';

export const getRecommendationsAction = createAction({
  name: 'cloudfix_get_recommendations',
  displayName: 'Get Recommendations',
  description:
    'Get recommendations from CloudFix with filtering and pagination options.',
  auth: cloudfixAuth,
  props: {
    finderFixerId: Property.ShortText({
      displayName: 'Finder Fixer ID',
      description: 'The ID of the finder fixer',
      required: false,
    }),
    pageNumber: Property.Number({
      displayName: 'Page Number',
      description: 'The page number for pagination (starts from 1)',
      required: false,
      defaultValue: 1,
    }),
    pageLimit: Property.Number({
      displayName: 'Page Limit',
      description: 'The maximum number of recommendations per page',
      required: false,
      defaultValue: 200,
    }),
    sortBy: Property.StaticDropdown({
      displayName: 'Sort By',
      description: 'The field to sort the recommendations by',
      required: false,
      options: {
        options: [{ label: 'Scheduled At', value: 'scheduledAt' }],
      },
    }),
    sortOrder: Property.StaticDropdown({
      displayName: 'Sort Order',
      description: 'The order to sort the recommendations',
      required: false,
      options: {
        options: [
          { label: 'Descending', value: 'DESC' },
          { label: 'Ascending', value: 'ASC' },
        ],
      },
    }),
    includeParameters: Property.Checkbox({
      displayName: 'Include Parameters',
      description: 'Whether to include parameters in the response',
      required: false,
      defaultValue: true,
    }),
    status: Property.StaticMultiSelectDropdown({
      displayName: 'Status Filter',
      description: 'Filter recommendations by status',
      required: false,
      options: {
        options: [
          { label: 'Manual Approval', value: 'MANUAL_APPROVAL' },
          { label: 'Suggested', value: 'SUGGESTED' },
          { label: 'Scheduled', value: 'SCHEDULED' },
          { label: 'In Progress', value: 'IN_PROGRESS' },
        ],
      },
    }),
  },
  async run(context) {
    const finderFixerId = context.propsValue['finderFixerId'];
    const pageNumber = context.propsValue['pageNumber'];
    const pageLimit = context.propsValue['pageLimit'];
    const sortBy = context.propsValue['sortBy'];
    const sortOrder = context.propsValue['sortOrder'];
    const includeParameters = context.propsValue['includeParameters'];
    const status = context.propsValue['status'];

    const queryParams = buildQueryParams({
      finderFixerId,
      pageNumber,
      pageLimit,
      sortBy,
      sortOrder,
      includeParameters,
      status,
    });

    const response = await makeRequest({
      auth: context.auth as CloudfixAuth,
      endpoint: '/recommendations',
      method: HttpMethod.GET,
      queryParams,
    });

    return response;
  },
});

function buildQueryParams(params: {
  finderFixerId?: string;
  pageNumber?: number;
  pageLimit?: number;
  sortBy?: string;
  sortOrder?: string;
  includeParameters?: boolean;
  status?: string[];
}): Record<string, string> {
  const queryParams = new URLSearchParams();

  if (params.finderFixerId) {
    queryParams.append('finderFixerId', params.finderFixerId);
  }

  if (params.pageNumber) {
    queryParams.append('pageNumber', params.pageNumber.toString());
  }

  if (params.pageLimit) {
    queryParams.append('pageLimit', params.pageLimit.toString());
  }

  if (params.sortBy) {
    queryParams.append('sortBy', params.sortBy);
  }

  if (params.sortOrder) {
    queryParams.append('sortOrder', params.sortOrder);
  }

  if (params.includeParameters !== undefined) {
    queryParams.append(
      'includeParameters',
      params.includeParameters.toString(),
    );
  }

  if (params.status && params.status.length > 0) {
    params.status.forEach((s: string) => {
      queryParams.append('status', s);
    });
  }

  const result: Record<string, string> = {};
  queryParams.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}
