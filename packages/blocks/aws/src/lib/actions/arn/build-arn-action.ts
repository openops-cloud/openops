import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import { buildArn } from '@openops/common';

export const buildArnAction = createAction({
  auth: BlockAuth.None(),
  name: 'build_arn',
  description: 'Build ARN (Amazon Resource Name) from the given parameters',
  displayName: 'Build ARN',
  isWriteAction: false,
  props: {
    service: Property.ShortText({
      displayName: 'Service',
      required: true,
    }),
    region: Property.ShortText({
      displayName: 'Region',
      required: true,
    }),
    accountId: Property.ShortText({
      displayName: 'Account ID',
      required: true,
    }),
    resourceId: Property.ShortText({
      displayName: 'Resource ID',
      required: true,
    }),
  },
  async run({ propsValue }) {
    const { service, accountId, resourceId, region } = propsValue;

    const arn = buildArn({
      service,
      accountId,
      resource: resourceId,
      region,
    });

    return arn;
  },
});
