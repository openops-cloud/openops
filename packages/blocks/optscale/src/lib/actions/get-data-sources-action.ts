import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { optscaleAuth } from '../auth';
import { sendOptScaleRequest } from '../common/make-request';
import { organizationProperty } from '../common/properties';

export const getDataSourcesAction = createAction({
  auth: optscaleAuth,
  name: 'optscale_get_data_sources',
  displayName: 'Get Data Sources',
  description:
    'Get the cloud accounts (data sources) connected to an OptScale organization, including cost and forecast details',
  isWriteAction: false,
  props: {
    organizationId: organizationProperty,
  },
  async run(context) {
    const { cloud_accounts } = await sendOptScaleRequest<{
      cloud_accounts: unknown[];
    }>({
      auth: context.auth,
      method: HttpMethod.GET,
      path: `/organizations/${context.propsValue.organizationId}/cloud_accounts`,
      query: { details: true },
    });

    return cloud_accounts;
  },
});
