import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  deleteEbsSnapshot,
  dryRunCheckBox,
  getCredentialsForAccount,
  parseArn,
  waitForProperties,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

export const ebsDeleteSnapshotAction = createAction({
  auth: amazonAuth,
  name: 'ebs_delete_snapshot_action',
  description: 'Delete the provided EBS Snapshot',
  displayName: 'EBS Delete Snapshot',
  riskLevel: RiskLevel.HIGH,
  requireToolApproval: false,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      description: 'The ARN of the EBS Snapshot to delete',
      required: true,
    }),
    ...waitForProperties(),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    try {
      const {
        arn,
        waitForTimeInSecondsProperty: { waitForTimeInSeconds },
      } = context.propsValue;
      const { region, resourceId, accountId } = parseArn(arn);
      const credentials = await getCredentialsForAccount(
        context.auth,
        accountId,
      );
      return await deleteEbsSnapshot(
        credentials,
        region,
        resourceId,
        context.propsValue['dryRun'],
        waitForTimeInSeconds,
      );
    } catch (error) {
      throw new Error(
        'An error occurred while deleting the EBS Snapshot: ' + error,
      );
    }
  },
});
