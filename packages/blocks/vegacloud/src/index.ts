import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { getAnomaliesAction } from './lib/actions/get-anomalies-action';
import { vegacloudAuth } from './lib/auth';
import { generateJwt } from './lib/common';

export const vegacloud = createBlock({
  displayName: 'Vega Cloud',
  auth: vegacloudAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/vegacloud.svg',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    getAnomaliesAction,
    createCustomApiCallAction({
      baseUrl: () => 'https://api.vegacloud.io/vegaapi/',
      auth: vegacloudAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Vega Cloud API documentation](https://docs.vegacloud.io/docs/category/-api-reference).',
        }),
      },
      authMapping: async (context: any) => {
        const { access_token } = await generateJwt(context.auth);

        return {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        };
      },
    }),
  ],
  triggers: [],
});
