import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { deleteRecordAction } from './actions/delete-record-action';
import { getRecordAction } from './actions/get-record-action';
import { getRecordsAction } from './actions/get-records-action';
import { getRequestsAction, upsertRequestAction } from './actions/requests';
import { deleteRequestAction } from './actions/requests/delete-request-action';
import { upsertRecordAction } from './actions/upsert-record-action';
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
    getRecordsAction,
    getRecordAction,
    upsertRecordAction,
    deleteRecordAction,
    getRequestsAction,
    upsertRequestAction,
    deleteRequestAction,
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
