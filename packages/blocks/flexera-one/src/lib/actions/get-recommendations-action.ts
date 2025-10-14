import { createAction, Property } from '@openops/blocks-framework';
import { flexeraAuth } from '../auth';
import { getAppliedPolicies } from '../common/automations-api';
import { getActiveRecommendations } from '../common/recommendations-api';

export const getActiveRecommendationsAction = createAction({
  auth: flexeraAuth,
  name: 'flexera_get_active_recommendations',
  description: 'Get Active Recommendations',
  displayName: 'Get Active Recommendations',
  isWriteAction: false,
  props: {
    policySet: Property.Dropdown({
      displayName: 'Policy Set',
      description: 'The policy set to use for getting recommendations.',
      required: true,
      refreshers: ['auth'],
      options: async ({ auth }) => {
        const { appRegion, refreshToken, orgId, projectId } = auth as any;

        const policies = await getAppliedPolicies({
          appRegion,
          refreshToken,
          orgId,
          projectId,
        });

        const policySets: string[] = Array.from(
          new Set(
            policies
              .map((policy: any) => policy.info?.policy_set)
              .filter((val) => Boolean(val) && val !== '' && val !== 'N/A'),
          ),
        );

        return {
          disabled: false,
          options: policySets.map((policySet: string) => ({
            label: policySet,
            value: policySet,
          })),
        };
      },
    }),
    provider: Property.StaticDropdown({
      displayName: 'Filter by Provider',
      description: 'Filter recommendations by cloud provider.',
      required: false,
      options: {
        options: [
          { label: 'AWS', value: 'AWS' },
          { label: 'Azure', value: 'Azure' },
          { label: 'Google', value: 'Google' },
          { label: 'Alibaba', value: 'Alibaba' },
        ],
      },
    }),
  },
  async run(context) {
    const { refreshToken, appRegion, orgId } = context.auth;
    const { policySet, provider } = context.propsValue;

    const recommendations = await getActiveRecommendations({
      refreshToken,
      appRegion,
      orgId,
    });

    return (
      recommendations.filter((recommendation: any) => {
        const matchesPolicySet = recommendation.policySet === policySet;

        if (provider) {
          return matchesPolicySet && recommendation.vendor === provider;
        }
        return matchesPolicySet;
      }) || []
    );
  },
});
