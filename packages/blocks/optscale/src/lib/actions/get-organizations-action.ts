import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { optscaleAuth } from '../auth';
import { sendOptScaleRequest } from '../common/make-request';

export const getOrganizationsAction = createAction({
  auth: optscaleAuth,
  name: 'optscale_get_organizations',
  displayName: 'Get Organizations',
  description: 'Get the OptScale organizations the user is a member of',
  isWriteAction: false,
  props: {},
  async run(context) {
    const { organizations } = await sendOptScaleRequest<{
      organizations: unknown[];
    }>({
      auth: context.auth,
      method: HttpMethod.GET,
      path: '/organizations',
    });

    return organizations;
  },
});
