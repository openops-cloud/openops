import { createCustomApiCallAction } from '@openops/blocks-common';
import { Property } from '@openops/blocks-framework';
import {
  authenticateUserWithAzure,
  azureAuth,
  getUseHostSessionProperty,
} from '@openops/common';
import { runCommand } from '../azure-cli';
import { subDropdown } from '../common-properties';

const getHostAccessToken = async (
  auth: unknown,
  subscription?: string,
): Promise<string> => {
  const output = await runCommand(
    'account get-access-token --resource https://management.azure.com --output json',
    auth,
    true,
    subscription,
  );
  const parsed = JSON.parse(output ?? '{}');
  const token = parsed?.accessToken;
  if (!token) {
    throw new Error('Failed to obtain Azure access token');
  }
  return token as string;
};

export const customAzureApiCallAction = createCustomApiCallAction({
  auth: azureAuth,
  name: 'custom_azure_api_call',
  description: 'Make a custom REST API call to Azure.',
  displayName: 'Custom Azure API Call',
  baseUrl: () => 'https://management.azure.com?api-version=2024-10-21',
  additionalProps: {
    documentation: Property.MarkDown({
      value:
        'For more information, visit the [Azure API documentation](https://learn.microsoft.com/rest/api/azure/).',
    }),
    useHostSession: getUseHostSessionProperty('Azure', 'az login'),
    subscriptions: subDropdown,
  },
  authMapping: async (context: any) => {
    const useHostSession = context.propsValue['useHostSession'] as
      | Record<string, unknown>
      | undefined;
    const selectedSubscription = context.propsValue?.subscriptions?.[
      'subDropdown'
    ] as string | undefined;
    const shouldUseHostCredentials =
      (useHostSession?.['useHostSessionCheckbox'] as boolean) === true;

    const token = shouldUseHostCredentials
      ? await getHostAccessToken(context.auth, selectedSubscription)
      : (await authenticateUserWithAzure(context.auth)).access_token;

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  },
});
