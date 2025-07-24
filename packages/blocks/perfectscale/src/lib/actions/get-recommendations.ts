import { createAction, Property } from '@openops/blocks-framework';
import { perfectscaleAuth } from '../auth';
import { getClusterRecommendations, getClusters } from '../common/clusters-api';

export const getRecommendationsAction = createAction({
  name: 'perfectscale_get_recommendations',
  displayName: 'Get Cluster Recommendations',
  description: 'Get Cluster recommendations',
  auth: perfectscaleAuth,
  props: {
    clusterUId: Property.Dropdown({
      displayName: 'Cluster',
      description: 'Filter recommendations by cluster.',
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

        const clusters = await getClusters(auth);

        return {
          disabled: false,
          options: clusters.map((cluster: any) => ({
            label: cluster.name,
            value: cluster.uid,
          })),
        };
      },
    }),
  },
  async run(context) {
    const result = await getClusterRecommendations(
      context.auth,
      context.propsValue.clusterUId,
    );

    return result;
  },
});
