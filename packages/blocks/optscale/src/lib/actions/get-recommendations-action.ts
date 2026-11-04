import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { optscaleAuth } from '../auth';
import {
  pathSegment,
  sendOptScaleRequest,
  toOptionalInteger,
} from '../common/make-request';
import {
  cloudAccountsProperty,
  organizationProperty,
} from '../common/properties';
import {
  getRecommendationCategory,
  getRecommendationTypeOptions,
} from '../common/recommendation-types';

type RecommendationStatus = 'active' | 'dismissed' | 'excluded';

interface RecommendationGroup {
  items?: Record<string, unknown>[];
}

type OptimizationsResponse = Record<
  'optimizations' | 'dismissed_optimizations' | 'excluded_optimizations',
  Record<string, RecommendationGroup> | undefined
>;

const STATUS_RESPONSE_KEY: Record<
  RecommendationStatus,
  keyof OptimizationsResponse
> = {
  active: 'optimizations',
  dismissed: 'dismissed_optimizations',
  excluded: 'excluded_optimizations',
};

export const getRecommendationsAction = createAction({
  auth: optscaleAuth,
  name: 'optscale_get_recommendations',
  displayName: 'Get Recommendations',
  description:
    'Get OptScale optimization recommendations as a flat list sorted by monthly saving',
  isWriteAction: false,
  props: {
    organizationId: organizationProperty,
    recommendationTypes: Property.StaticMultiSelectDropdown({
      displayName: 'Recommendation Types',
      description: 'The types of recommendations to fetch',
      required: true,
      options: { options: getRecommendationTypeOptions() },
    }),
    cloudAccountIds: cloudAccountsProperty(),
    status: Property.StaticDropdown<RecommendationStatus, true>({
      displayName: 'Status',
      required: true,
      defaultValue: 'active',
      options: {
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Dismissed', value: 'dismissed' },
          { label: 'Excluded', value: 'excluded' },
        ],
      },
    }),
    limit: Property.Number({
      displayName: 'Limit per Type',
      description:
        'The maximum number of recommendations to return for each type, highest saving first',
      required: false,
    }),
    minSaving: Property.Number({
      displayName: 'Minimum Monthly Saving',
      description:
        'Only return recommendations with at least this monthly saving, in the organization currency',
      required: false,
    }),
  },
  async run(context) {
    const auth = context.auth;
    const {
      organizationId,
      recommendationTypes,
      cloudAccountIds,
      status,
      limit,
      minSaving,
    } = context.propsValue;

    const limitPerType = toOptionalInteger(limit, 'Limit per Type', 1);

    const [organization, response] = await Promise.all([
      sendOptScaleRequest<{ currency?: string }>({
        auth,
        method: HttpMethod.GET,
        path: `/organizations/${pathSegment(organizationId)}`,
      }),
      sendOptScaleRequest<OptimizationsResponse>({
        auth,
        method: HttpMethod.GET,
        path: `/organizations/${pathSegment(organizationId)}/optimizations`,
        query: {
          type: recommendationTypes,
          cloud_account_id: cloudAccountIds,
          status,
          limit: limitPerType,
        },
      }),
    ]);

    const groups = response[STATUS_RESPONSE_KEY[status]] ?? {};

    return Object.entries(groups)
      .flatMap(([recommendationType, group]) =>
        (group.items ?? []).map((item) => ({
          ...item,
          recommendationType,
          category: getRecommendationCategory(recommendationType),
          currency: organization.currency,
        })),
      )
      .filter((item) => minSaving == null || getSaving(item) >= minSaving)
      .sort((a, b) => getSaving(b) - getSaving(a));
  },
});

function getSaving(item: Record<string, unknown>): number {
  return typeof item['saving'] === 'number' ? item['saving'] : 0;
}
