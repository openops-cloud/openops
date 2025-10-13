import { Property, createAction } from '@openops/blocks-framework';
import {
  amazonAuth,
  getCredentialsForAccount,
  parseArn,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { getCloudFormationTemplate } from '../get-template';

export const getStack = createAction({
  auth: amazonAuth,
  name: 'get_stack_template',
  displayName: 'Get CloudFormation template',
  description:
    'Get the CloudFormation stack template that matches the given arn.',
  IsWriteAction: false,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      description: 'The ARN of the stack to fetch.',
      required: true,
    }),
  },
  async run(context) {
    const { arn } = context.propsValue;

    const { region, accountId } = parseArn(arn);

    try {
      const credentials = await getCredentialsForAccount(
        context.auth,
        accountId,
      );

      return await getCloudFormationTemplate(credentials, region, arn);
    } catch (error) {
      const message = `An error occurred while fetching cloudformation stack: ${arn}`;
      logger.error(message, { error, arn });
      throw new Error(message);
    }
  },
});
