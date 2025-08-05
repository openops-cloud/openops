import { httpClient, HttpMethod } from '@openops/blocks-common';
import { BlockAuth, Property } from '@openops/blocks-framework';
import { generateAuthHeader } from './generate-auth-header';

export interface ServiceNowAuth {
  username: string;
  password: string;
  instanceName: string;
}

export const servicenowAuth = BlockAuth.CustomAuth({
  authProviderKey: 'servicenow',
  authProviderDisplayName: 'ServiceNow',
  authProviderLogoUrl: 'https://static.openops.com/blocks/servicenow.png',
  required: true,
  props: {
    username: Property.ShortText({
      displayName: 'Username',
      description: 'Your ServiceNow username',
      required: true,
    }),
    password: Property.SecretText({
      displayName: 'Password',
      description: 'Your ServiceNow password',
      required: true,
    }),
    instanceName: Property.ShortText({
      displayName: 'Instance name',
      description:
        'The name of your ServiceNow instance (for example: https://<instance>.service-now.com/)',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    const { username, password, instanceName } = auth;

    try {
      await httpClient.sendRequest({
        method: HttpMethod.GET,
        url: `https://${instanceName}.service-now.com/api/now/ui/user/current_user`,
        headers: {
          ...generateAuthHeader({ username, password }),
          Accept: 'application/json',
        },
      });
      return { valid: true };
    } catch {
      return {
        valid: false,
        error:
          'Failed to authenticate with ServiceNow. Please check your credentials and try again.',
      };
    }
  },
});
