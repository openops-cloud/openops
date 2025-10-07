import { createAction, Property } from '@openops/blocks-framework';
import { nopsAuth } from '../auth';
import { makeGetRequest } from '../common/http-client';

export const getOrganizationAccountsAction = createAction({
  name: 'nops_get_organization_accounts',
  displayName: 'Get Organization Accounts',
  description: 'Retrieve AWS/Azure organization accounts (projects) configured in nOps',
  auth: nopsAuth,
  requireToolApproval: false,
  props: {
  },
  async run(context) {
    const endpoint = '/c/admin/projectaws/organization_accounts/';
    
    console.log('[nOps] Making request to:', endpoint);
    console.log('[nOps] Request details:', {
      method: 'GET',
      endpoint,
    });

    const response = await makeGetRequest(context.auth, endpoint, undefined, undefined);

    console.log('[nOps] Response received:', {
      status: response.status,
      body: response.body,
    });

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

