import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  dryRunCheckBox,
  getCredentialsForAccount,
  parseArn,
  startInstance,
  waitForProperties,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

export const ec2StartInstanceAction = createAction({
  auth: amazonAuth,
  name: 'ec2_start_instance',
  description: 'EC2 start a given instance',
  displayName: 'EC2 Start Instance',
  riskLevel: RiskLevel.HIGH,
  IsWriteAction: true,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      description: 'The ARN of the EC2 instance to start',
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

      return await startInstance(
        credentials,
        resourceId,
        region,
        context.propsValue['dryRun'],
        waitForInSeconds,
      );
    } catch (error) {
      throw new Error(
        'An error occurred while starting EC2 instance: ' + error,
      );
    }
  },
});
