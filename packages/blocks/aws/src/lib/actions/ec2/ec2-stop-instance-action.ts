import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  dryRunCheckBox,
  getCredentialsForAccount,
  parseArn,
  stopInstance,
  waitForProperties,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

export const ec2StopInstanceAction = createAction({
  auth: amazonAuth,
  name: 'ec2_stop_instance',
  description: 'EC2 stop a given instance',
  displayName: 'EC2 Stop Instance',
  riskLevel: RiskLevel.HIGH,
  requireToolApproval: true,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      description: 'The ARN of the EC2 instance to stop',
      required: true,
    }),
    dryRun: dryRunCheckBox(),
    ...waitForProperties(),
  },
  async run(context) {
    try {
      const { arn } = context.propsValue;
      const { region, resourceId, accountId } = parseArn(arn);
      const credentials = await getCredentialsForAccount(
        context.auth,
        accountId,
      );
      const waitForInSeconds =
        context.propsValue['waitForTimeInSecondsProperty'][
          'waitForTimeInSeconds'
        ];

      return await stopInstance(
        credentials,
        resourceId,
        region,
        context.propsValue['dryRun'],
        waitForInSeconds,
      );
    } catch (error) {
      throw new Error(
        'An error occurred while stopping EC2 instance: ' + error,
      );
    }
  },
});
