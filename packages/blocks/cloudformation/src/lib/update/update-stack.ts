import { Property, createAction } from '@openops/blocks-framework';
import {
  amazonAuth,
  dryRunCheckBox,
  getCredentialsForAccount,
  parseArn,
  waitForProperties,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { RiskLevel } from '@openops/shared';
import { applyTemplateUpdate } from '../apply-template-update';

export const updateStack = createAction({
  auth: amazonAuth,
  name: 'apply_template',
  displayName: 'Apply CloudFormation template',
  description: 'Update the CloudFormation template that matches the given ARN.',
  riskLevel: RiskLevel.HIGH,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      description: 'The ARN of the stack to update.',
      required: true,
    }),
    template: Property.LongText({
      displayName: 'Updated CloudFormation template',
      description:
        'CloudFormation template with the new changes to be applied.',
      required: true,
    }),
    ...waitForProperties(),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    const { arn, template, dryRun } = context.propsValue;

    if (dryRun) {
      return `Step execution skipped, dry run flag enabled.`;
    }

    const waitForInSeconds =
      context.propsValue['waitForTimeInSecondsProperty'][
        'waitForTimeInSeconds'
      ];

    const { region, accountId } = parseArn(arn);

    try {
      const credentials = await getCredentialsForAccount(
        context.auth,
        accountId,
      );

      const result = await applyTemplateUpdate(
        credentials,
        region,
        arn,
        template,
        waitForInSeconds,
      );

      return result;
    } catch (error) {
      const message = `An error occurred while updating cloudformation stack. Message: ${
        (error as Error).message
      }`;
      logger.error(message, { arn, error });
      throw new Error(message);
    }
  },
});
