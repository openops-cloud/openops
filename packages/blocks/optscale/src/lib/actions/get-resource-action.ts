import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { optscaleAuth } from '../auth';
import { pathSegment, sendOptScaleRequest } from '../common/make-request';

export const getResourceAction = createAction({
  auth: optscaleAuth,
  name: 'optscale_get_resource',
  displayName: 'Get Resource Details',
  description:
    'Get the details of an OptScale resource, including owner, pool, tags, cost and recommendations',
  isWriteAction: false,
  props: {
    resourceId: Property.ShortText({
      displayName: 'Resource ID',
      description:
        'The OptScale resource ID (the "resource_id" field in recommendations and expenses, not the cloud resource ID)',
      required: true,
    }),
  },
  async run(context) {
    return sendOptScaleRequest({
      auth: context.auth,
      method: HttpMethod.GET,
      path: `/cloud_resources/${pathSegment(context.propsValue.resourceId)}`,
      query: { details: true },
    });
  },
});
