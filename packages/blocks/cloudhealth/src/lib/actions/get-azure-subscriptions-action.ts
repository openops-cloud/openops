import { createAction } from '@openops/blocks-framework';
import { cloudhealthAuth } from '../auth';
import { getAzureSubscriptions } from '../common/get-azure-subscriptions';

export const getAzureSubscriptionsAction = createAction({
  name: 'cloudhealth_get_azure_subscriptions',
  displayName: 'Get Azure Subscriptions',
  description: 'Retrieve a list of Azure subscriptions',
  auth: cloudhealthAuth,
  IsWriteAction: false,
  props: {},
  async run(context) {
    return await getAzureSubscriptions(context.auth);
  },
});
