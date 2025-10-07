import { createCustomApiCallAction } from '@openops/blocks-common';
import { authenticateUserWithAzure, azureAuth } from '@openops/common';

export const customAzureApiCallAction = createCustomApiCallAction({
  auth: azureAuth,
  name: 'custom_azure_api_call',
  description: 'Make a custom REST API call to Azure',
  displayName: 'Custom Azure API Call',
  baseUrl: () => 'https://management.azure.com?api-version=2024-10-21',
  authMapping: async (context: any) => {
    const { access_token } = await authenticateUserWithAzure(context.auth);
    return {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    };
  },
});
