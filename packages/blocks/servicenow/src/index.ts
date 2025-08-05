import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { servicenowAuth } from './lib/auth';

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
            'For more information, visit the [ServiceNow API documentation](https://developer.servicenow.com/dev.do#!/reference/api/yokohama/rest/).',
        }),
      },
      authMapping: async (context: any) => {
        return {
          Authorization: `Basic ${Buffer.from(
            `${context.auth.username}:${context.auth.password}`,
          ).toString('base64')}`,
        };
      },
    }),
  ],
  triggers: [],
});
