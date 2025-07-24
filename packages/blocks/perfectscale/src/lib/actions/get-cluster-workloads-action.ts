import { createAction, Property } from '@openops/blocks-framework';
import { perfectscaleAuth } from '../auth';
import { getClusters, getClusterWorkloads } from '../common/clusters-api';

export const getClusterWorkloadsAction = createAction({
  name: 'perfectscale_get_cluster_workloads',
  displayName: 'Get Cluster Workloads',
  description: 'Get Cluster Workloads',
  auth: perfectscaleAuth,
  props: {
    clusterUId: Property.Dropdown({
      displayName: 'Cluster',
      description: 'Select cluster for which you want to see workloads',
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
    return await getClusterWorkloads(
      context.auth,
      context.propsValue.clusterUId,
    );
  },
});
