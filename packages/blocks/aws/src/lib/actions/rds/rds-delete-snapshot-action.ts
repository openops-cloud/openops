import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  dryRunCheckBox,
  getCredentialsForAccount,
  initiateRdsSnapshotDeletion,
  parseArn,
  waitForProperties,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

export const rdsDeleteSnapshotAction = createAction({
  auth: amazonAuth,
  name: 'rds_delete_snapshot',
  description: 'Delete the provided RDS Snapshot',
  displayName: 'RDS Delete Snapshot',
  riskLevel: RiskLevel.HIGH,
  isWriteAction: true,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      description: 'The ARN of the RDS Snapshot to delete',
      required: true,
    }),
    ...waitForProperties(),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    const { arn, dryRun } = context.propsValue;

    if (dryRun) {
      return 'Step execution skipped, dry run flag enabled.';
    }

    const { region, resourceId, accountId } = parseArn(arn);
    const waitForInSeconds =
      context.propsValue['waitForTimeInSecondsProperty'][
        'waitForTimeInSeconds'
      ];
    const credentials = await getCredentialsForAccount(context.auth, accountId);
    const result = await initiateRdsSnapshotDeletion(
      credentials,
      region,
      resourceId,
      waitForInSeconds,
    );

    return result;
  },
});
