import {
  createCustomApiCallAction,
  httpClient,
  HttpMethod,
} from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { ServiceNowAuth, servicenowAuth } from './lib/auth';

export const servicenow = createBlock({
  displayName: 'ServiceNow',
  auth: servicenowAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/servicenow.png',
  authors: [],
  categories: [BlockCategory.COLLABORATION],
  actions: [
    createCustomApiCallAction({
      baseUrl: (auth: any) =>
        `https://${auth.instanceName}.service-now.com/api/`,
      auth: servicenowAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Servicenow API documentation](https://developer.servicenow.com/dev.do#!/reference/api/yokohama/rest/).',
        }),
      },
      authMapping: async (context: any) => {
        if (context.auth.username) {
          return {
            Authorization: `Basic ${Buffer.from(
              `${context.auth.username}:${context.auth.password}`,
            ).toString('base64')}`,
          };
        }

        const accessToken = generateJwt(context.auth);

        return {
          Authorization: `Bearer ${accessToken}`,
        };
      },
    }),
  ],
  triggers: [],
});

async function generateJwt(auth: ServiceNowAuth): Promise<string> {
  const body = {
    grant_type: 'client_credentials',
    client_id: auth.clientId,
    client_secret: auth.clientSecret,
  };

  const response = await httpClient.sendRequest({
    method: HttpMethod.POST,
    url: `https://${auth.instanceName}.service-now.com/oauth_token.do`,
    body: body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.body.access_token;
}
