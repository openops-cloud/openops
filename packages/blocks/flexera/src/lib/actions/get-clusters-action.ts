import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { flexeraSpotAuth } from '../../auth';

export const getClustersAction = createAction({
  auth: flexeraSpotAuth,
  name: 'flexera_get_clusters',
  description: 'Get clusters from Flexera Spot',
  displayName: 'Get Clusters',
  isWriteAction: false,
  props: {
    accountId: Property.Dropdown({
      displayName: 'Account',
      description: 'The account to get clusters from',
      required: true,
      refreshers: ['auth'],
      options: async ({ auth }: any) => {
        const response = await httpClient.sendRequest({
          method: HttpMethod.GET,
          url: `https://api.spotinst.io/setup/account`,
          headers: {
            Authorization: `Bearer ${auth}`,
          },
        });

        return {
          disabled: false,
          options: response.body.response.items?.map((account: any) => ({
            label: account.name,
            value: account.accountId,
          })),
        };
      },
    }),
  },
  async run(context) {
    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `https://api.spotinst.io/ocean/aws/k8s/cluster?accountId=${context.propsValue.accountId}`,
      headers: {
        Authorization: `Bearer ${context.auth}`,
      },
    });

    return response.body;
  },
});
