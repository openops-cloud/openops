import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import { parseArn } from '@openops/common';

export const parseArnAction = createAction({
  auth: BlockAuth.None(),
  requireAuth: false,
  name: 'parse_arn',
  description: 'Parse information from a given ARN (Amazon Resource Name) ',
  displayName: 'Parse ARN',
  isWriteAction: false,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      required: true,
    }),
  },
  async run({ propsValue }) {
    const { arn } = propsValue;
    const arnObj = parseArn(arn);

    return arnObj;
  },
});
