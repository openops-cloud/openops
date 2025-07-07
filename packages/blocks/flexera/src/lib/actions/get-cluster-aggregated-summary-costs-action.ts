import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { flexeraAuth } from '../../auth';

export const getClusterAggregatedSummaryCostsAction = createAction({
  auth: flexeraAuth,
  name: 'flexera_get_cluster_aggregated_summary_cost',
  description: 'Get aggregated summary costs for a cluster',
  displayName: 'Get Cluster Aggregated Summary Costs',
  props: {
    clusterId: Property.ShortText({
      displayName: 'Cluster ID',
      description:
        'The ID of the cluster for which to retrieve aggregated summary costs.',
      required: true,
    }),
  },
  async run(context) {
    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `https://api.spotinst.io/ocean/aws/k8s/cluster/${context.propsValue.clusterId}/aggregatedCosts/summary`,
      headers: {
        Authorization: `Bearer ${context.auth}`,
      },
    });

    return response.body;
  },
});
