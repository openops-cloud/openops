import { createAction } from '@openops/blocks-framework';
import { nopsAuth } from '../auth';
import { makeGetRequest } from '../common/http-client';

export const getOrganizationAccountsAction = createAction({
  name: 'nops_get_organization_accounts',
  displayName: 'Get Organization Accounts',
  description:
    'Retrieve AWS/Azure organization accounts (projects) configured in nOps',
  auth: nopsAuth,
  IsWriteAction: false,
  props: {},
  async run(context) {
    const endpoint = '/c/admin/projectaws/organization_accounts/';

    const response = await makeGetRequest(context.auth, endpoint);

    return {
      _debug: {
        request: {
          method: 'GET',
          endpoint,
        },
        response: {
          status: response.status,
        },
      },
      accounts: response.body,
    };
  },
});
