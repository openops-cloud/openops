import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { addVirtualTagFilterValueAction } from './lib/actions/add-virtual-tag-filter-value-action';
import { getViewDataAction } from './lib/actions/get-view-data-action';
import { getVirtualTagValuesAction } from './lib/actions/get-virtual-tags-action';
import { finoutAuth } from './lib/auth';
import { BASE_URL } from './lib/common/make-request';

export const finout = createBlock({
  displayName: 'Finout',
  auth: finoutAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/finout.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    getViewDataAction,
    getVirtualTagValuesAction,
    addVirtualTagFilterValueAction,
    createCustomApiCallAction({
      baseUrl: () => BASE_URL,
      auth: finoutAuth,
      authMapping: async ({ auth }: any) => ({
        'x-finout-client-id': auth.clientId,
        'x-finout-secret-key': auth.secretKey,
      }),
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Finout API documentation](https://docs.finout.io/configuration/finout-api).',
        }),
      },
    }),
  ],
  triggers: [],
});
