import { BlockAuth, Property } from '@openops/blocks-framework';

export interface ServiceNowAuth {
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  instanceName: string;
}

const markdown = `
To use the ServiceNow block, you can either input your ServiceNow credentials directly or use OAuth 2.0 for authentication.

If you choose to input your credentials directly, leave the client ID and client secret fields empty.

If you choose to use OAuth 2.0, you will need to set up an OAuth 2.0 client in your ServiceNow instance and provide the client ID and client secret here.
For more information on how to set up OAuth 2.0 in ServiceNow, please refer to the [ServiceNow documentation](https://www.servicenow.com/docs/bundle/yokohama-api-reference/page/integrate/inbound-rest/task/t_EnableOAuthWithREST.html) and the following [ServiceNow post](https://support.servicenow.com/kb?id=kb_article_view&sysparm_article=KB1645212).`;

export const servicenowAuth = BlockAuth.CustomAuth({
  authProviderKey: 'servicenow',
  authProviderDisplayName: 'ServiceNow',
  authProviderLogoUrl: 'https://static.openops.com/blocks/servicenow.png',
  description: markdown,
  required: true,
  props: {
    username: Property.SecretText({
      displayName: 'Username',
      description: 'Your ServiceNow username',
      required: false,
    }),
    password: Property.SecretText({
      displayName: 'Password',
      description: 'Your ServiceNow password',
      required: false,
    }),
    clientId: Property.SecretText({
      displayName: 'Client ID',
      description: 'The client ID for ServiceNow API',
      required: false,
    }),
    clientSecret: Property.SecretText({
      displayName: 'Client Secret',
      description: 'The client secret for ServiceNow API',
      required: false,
    }),
    instanceName: Property.ShortText({
      displayName: 'Instance name',
      description:
        'The name of your ServiceNow instance (for example: https://<instance>.service-now.com/)',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    const hasClient = auth.clientId && auth.clientSecret;
    const hasUser = auth.username && auth.password;

    if (!hasClient && !hasUser) {
      throw new Error(
        'You must provide either (Client ID and Client Secret) or (Username and Password) for authentication.',
      );
    }
    if (
      (auth.clientId && !auth.clientSecret) ||
      (!auth.clientId && auth.clientSecret)
    ) {
      throw new Error(
        'Both Client ID and Client Secret must be provided together.',
      );
    }
    if (
      (auth.username && !auth.password) ||
      (!auth.username && auth.password)
    ) {
      throw new Error('Both Username and Password must be provided together.');
    }

    return { valid: true };
  },
});
