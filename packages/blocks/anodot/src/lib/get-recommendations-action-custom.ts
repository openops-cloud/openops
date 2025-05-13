import { createAction } from '@openops/blocks-framework';
import { isEmpty } from '@openops/shared';
import { accountProperty } from './account-property';
import { anadotAuth } from './anodot-auth-property';
import { annualSavingsProperty } from './api-filters/annual-savings-property';
import { categoryProperty } from './api-filters/category-property';
import { closedAndDoneRecommendationsProperty } from './api-filters/closed-and-done-recommendations-property';
import { customStatusProperty } from './api-filters/custom-status-property';
import { listFilterProperty } from './api-filters/list-filter-property';
import { openedRecommendationsProperty } from './api-filters/opened-recommendations-property';
import { statusProperty } from './api-filters/status-property';
import { tagsProperty } from './api-filters/tags-property';
import { virtualTagsProperty } from './api-filters/virtual-tags-property';
import { buildUserAccountApiKey } from './common/anodot-requests-helpers';
import { authenticateUserWithAnodot } from './common/auth';
import {
  addClosedAndDoneDateFilters,
  addCustomStatusFilters,
  addFilterIfValid,
  addTagFilterIfValid,
  buildBaseRecommendationsRequestFilters,
} from './common/build-recommendation-filters-common';
import { getAnodotRecommendations } from './common/recommendations';
import { RecommendationsRequestFilters } from './common/recommendations-request-filters';

export const getRecommendationsCustomAction = createAction({
  auth: anadotAuth,
  name: 'get_recommendations',
  description: 'Get custom Umbrella recommendations',
  displayName: 'Get Recommendations (custom settings)',
  props: {
    accounts: accountProperty(),

    statusFilter: statusProperty(),

    customStatus: customStatusProperty(),

    openedRecommendations: openedRecommendationsProperty(),

    closedAndDoneRecommendations: closedAndDoneRecommendationsProperty(),

    ...tagsProperty(
      'useCustomTags',
      'Filter by custom tags',
      'customTags',
      'Custom tags filters',
      'Static tags that relate to a specific resource, these tags are part of the recommendation raw data.',
    ),

    ...virtualTagsProperty(),

    ...tagsProperty(
      'useEnrichmentTags',
      'Filter by enrichment tags',
      'enrichmentTags',
      'Enrichment tags filters',
      'Filter by keys and values defined by you.',
    ),

    ...listFilterProperty(
      'useTypeId',
      'Filter by type id',
      'typeId',
      'Type id filters',
      '',
    ),
    ...listFilterProperty(
      'useService',
      'Filter by service',
      'service',
      'Service filters',
      '',
    ),
    ...listFilterProperty(
      'useRegion',
      'Filter by region',
      'region',
      'Region filters',
      '',
    ),
    ...listFilterProperty(
      'useLinkedAccountId',
      'Filter by linked account id',
      'linkedAccountId',
      'Linked account id filters',
      '',
    ),
    ...listFilterProperty(
      'useInstanceType',
      'Filter by instance type',
      'instanceType',
      'Instance type filters',
      '',
    ),
    ...listFilterProperty(
      'useResourceId',
      'Filter by resource id',
      'resourceId',
      'Resource id filters',
      '',
    ),
    ...annualSavingsProperty(),
    categories: categoryProperty(),
  },
  async run(context) {
    try {
      const { authUrl, apiUrl, username, password } = context.auth;

      const accounts = context.propsValue.accounts as any[];

      const filters = buildRecommendationsFilters(context.propsValue);

      const anodotTokens = await authenticateUserWithAnodot(
        authUrl,
        username,
        password,
      );

      const result: Record<string, any> = {};
      for (const selectedAccount of accounts) {
        const accountApiKey = buildUserAccountApiKey(
          anodotTokens.apikey,
          selectedAccount.accountKey,
          selectedAccount.divisionId,
        );

        result[selectedAccount.accountName] = await getAnodotRecommendations(
          apiUrl,
          anodotTokens.Authorization,
          accountApiKey,
          filters,
        );
      }

      return result;
    } catch (error) {
      throw new Error(
        'An error occurred while requesting Anodot recommendations. Error Message: ' +
          (error as any).response?.data?.message,
      );
    }
  },
});

function buildRecommendationsFilters(
  props: any,
): RecommendationsRequestFilters {
  const filters: RecommendationsRequestFilters =
    buildBaseRecommendationsRequestFilters(props);

  addCustomStatusFilters(filters, props);
  addClosedAndDoneDateFilters(filters, props);

  if (!isEmpty(props.annualSavingsProperty)) {
    filters.annual_savings_greater_than = Number(
      props.annualSavingsProperty.annualSavingsMin,
    );
  }

  if (!isEmpty(props.categories)) {
    filters.cat_id = props.categories;
  }

  if (!isEmpty(props.virtualTag)) {
    filters.virtual_tag = {
      uuid: props.virtualTag.uuid,
      eq: props.virtualTag.eq,
      like: props.virtualTag.like,
    };
  }

  addFilterIfValid(filters, 'region', props.region);

  addFilterIfValid(filters, 'type_id', props.typeId);

  addFilterIfValid(filters, 'service', props.service);

  addFilterIfValid(filters, 'resource_id', props.resourceId);

  addFilterIfValid(filters, 'instance_type', props.instanceType);

  addFilterIfValid(filters, 'linked_account_id', props.linkedAccountId);

  addTagFilterIfValid(filters, 'custom_tags', props.customTags);

  addTagFilterIfValid(filters, 'enrichment_tags', props.enrichmentTags);

  return filters;
}
