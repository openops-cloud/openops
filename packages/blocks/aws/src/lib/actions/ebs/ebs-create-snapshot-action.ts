import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  createEbsSnapshot,
  dryRunCheckBox,
  getCredentialsForAccount,
  parseArn,
  waitForProperties,
} from '@openops/common';

export const ebsCreateSnapshotAction = createAction({
  auth: amazonAuth,
  name: 'ebs_create_snapshot_action',
  description: 'Create a snapshot of the provided EBS Volume',
  displayName: 'EBS Create Snapshot',
  requireToolApproval: false,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      description:
        'The ARN of the EBS Volume for which a snapshot will be created',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Snapshot Description',
      description: 'A description for the created snapshot',
      required: false,
    }),
    ...waitForProperties(),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    try {
      const { arn } = context.propsValue;
      const { region, resourceId, accountId } = parseArn(arn);
      const waitForInSeconds =
        context.propsValue['waitForTimeInSecondsProperty'][
          'waitForTimeInSeconds'
        ];
      const credentials = await getCredentialsForAccount(
        context.auth,
        accountId,
      );
      const result = await createEbsSnapshot({
        credentials,
        region: region,
        volumeId: resourceId,
        description: context.propsValue['description'],
        waitForInSeconds: waitForInSeconds,
        dryRun: context.propsValue['dryRun'],
      });

      return result;
    } catch (error) {
      throw new Error(
        'An error occurred while creating the EBS Snapshot: ' + error,
      );
    }
  },
});
