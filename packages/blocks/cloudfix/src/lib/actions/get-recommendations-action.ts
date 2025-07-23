import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { cloudfixAuth, CloudfixAuth } from '../common/auth';
import { makeRequest } from '../common/make-request';

export const getRecommendationsAction = createAction({
  name: 'get_recommendations',
  displayName: 'Get Recommendations',
  description: 'Get recommendations with filtering',
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
    // TODO: verify if theres more fields OR if it can be any field on a recommendation
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
    // TODO: verify these are all statuses
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
    const queryParamsString = buildQueryParams(context.propsValue);

    const response = await makeRequest({
      auth: context.auth as CloudfixAuth,
      endpoint: queryParamsString
        ? `/recommendations?${queryParamsString}`
        : '/recommendations',
      method: HttpMethod.GET,
    });

    return response;
  },
});

function buildQueryParams(propsValue: any): string {
  const {
    finderFixerId,
    pageNumber,
    pageLimit,
    sortBy,
    sortOrder,
    includeParameters,
    status,
  } = propsValue;

  const params: string[] = [];

  if (finderFixerId) {
    params.push(`finderFixerId=${encodeURIComponent(finderFixerId)}`);
  }

  if (pageNumber) {
    params.push(`pageNumber=${encodeURIComponent(pageNumber.toString())}`);
  }

  if (pageLimit) {
    params.push(`pageLimit=${encodeURIComponent(pageLimit.toString())}`);
  }

  if (sortBy) {
    params.push(`sortBy=${encodeURIComponent(sortBy)}`);
  }

  if (sortOrder) {
    params.push(`sortOrder=${encodeURIComponent(sortOrder)}`);
  }

  if (includeParameters !== undefined) {
    params.push(
      `includeParameters=${encodeURIComponent(includeParameters.toString())}`,
    );
  }

  if (status && status.length > 0) {
    status.forEach((statusValue: string) => {
      params.push(`status=${encodeURIComponent(statusValue)}`);
    });
  }

  return params.join('&');
}
