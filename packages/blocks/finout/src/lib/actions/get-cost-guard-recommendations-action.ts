import { createAction, Property } from '@openops/blocks-framework';
import { finoutAuth } from '../auth';
import { getScanRecommendations, getScans } from '../common/cost-guard';

export const getCostGuardRecommendationsAction = createAction({
  name: 'finout_get_cost_guard_recommendations',
  displayName: 'Get CostGuard Recommendations',
  description: 'Get CostGuard Recommendations',
  auth: finoutAuth,
  requireToolApproval: false,
  props: {
    scanId: Property.Dropdown({
      displayName: 'Scan',
      description: 'A list of available scans',
      refreshers: ['auth'],
      required: true,
      options: async ({ auth }: any) => {
        if (!auth) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Please authenticate first',
          };
        }

        const scans = await getScans(auth);

        return {
          disabled: false,
          options: scans
            .map((scan: any) => ({
              label: scan.name,
              value: scan.id,
            }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        };
      },
    }),
  },
  async run(context) {
    return await getScanRecommendations(
      context.auth,
      context.propsValue.scanId,
    );
  },
});
