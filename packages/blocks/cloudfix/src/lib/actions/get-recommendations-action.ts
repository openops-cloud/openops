import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { cloudfixAuth, CloudfixAuth } from '../common/auth';
import { makeRequest } from '../common/make-request';

enum RecommendationStatus {
  SUGGESTED = 'SUGGESTED',
  MANUAL_APPROVAL = 'MANUAL_APPROVAL',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
}

enum SortByField {
  ANNUAL_SAVINGS = 'annualSavings',
  UPDATED_AT = 'updatedAt',
  ANNUAL_COST = 'annualCost',
  SCHEDULED_AT = 'scheduledAt',
}

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
    sortBy: Property.StaticDropdown({
      displayName: 'Sort By',
      description: 'The field to sort the recommendations by',
      required: false,
      options: {
        options: [
          { label: 'Scheduled At', value: SortByField.SCHEDULED_AT },
          { label: 'Updated At', value: SortByField.UPDATED_AT },
          { label: 'Annual Savings', value: SortByField.ANNUAL_SAVINGS },
          { label: 'Annual Cost', value: SortByField.ANNUAL_COST },
        ],
      },
      defaultValue: SortByField.SCHEDULED_AT,
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
      defaultValue: 'DESC',
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
          { label: 'Suggested', value: RecommendationStatus.SUGGESTED },
          {
            label: 'Manual Approval',
            value: RecommendationStatus.MANUAL_APPROVAL,
          },
          { label: 'Scheduled', value: RecommendationStatus.SCHEDULED },
          { label: 'In Progress', value: RecommendationStatus.IN_PROGRESS },
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
