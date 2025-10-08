import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { getCostSummaryAction } from './lib/actions/get-cost-summary-action';
import { getOrganizationAccountsAction } from './lib/actions/get-organization-accounts-action';
import { nopsAuth } from './lib/auth';
import { BASE_NOPS_URL } from './lib/common/base-url';

export const nops = createBlock({
  displayName: 'nOps',
  description: 'Multi-cloud cost optimization and FinOps platform',
  auth: nopsAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/nops.png',
  authors: ['nOps'],
  categories: [BlockCategory.FINOPS],
  actions: [
    getCostSummaryAction,
    getOrganizationAccountsAction,
    createCustomApiCallAction({
      baseUrl: () => BASE_NOPS_URL,
      auth: nopsAuth,
      authMapping: async ({ auth }: any) => {
        const { apiKey } = auth || {};

        if (!apiKey) {
          throw new Error(
            'nOps API Key is required. Please configure your nOps connection with a valid API key.',
          );
        }

        const headers: Record<string, string> = {
          'X-Nops-Api-Key': apiKey,
          'Content-Type': 'application/json',
        };
        return headers;
      },
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [nOps Developer API documentation](https://help.nops.io/docs/nops/developer-intro).',
        }),
      },
      description: 'Make a custom REST API call to nOps',
      displayName: 'Custom REST API Call',
      name: 'custom_rest_api_call',
    }),
  ],
  triggers: [],
});
