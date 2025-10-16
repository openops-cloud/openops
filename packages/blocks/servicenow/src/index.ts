import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { createRecordAction } from './actions/create-record-action';
import { deleteRecordAction } from './actions/delete-record-action';
import { getRecordAction } from './actions/get-record-action';
import { listRecordsAction } from './actions/list-records-action';
import { updateRecordAction } from './actions/update-record-action';
import { servicenowAuth } from './lib/auth';
import { generateAuthHeader } from './lib/generate-auth-header';

export const servicenow = createBlock({
  displayName: 'ServiceNow',
  auth: servicenowAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/servicenow.png',
  authors: [],
  categories: [BlockCategory.COLLABORATION],
  actions: [
    listRecordsAction,
    getRecordAction,
    createRecordAction,
    updateRecordAction,
    deleteRecordAction,
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
        return generateAuthHeader({
          username: context.auth.username,
          password: context.auth.password,
        });
      },
    }),
  ],
  triggers: [],
});
