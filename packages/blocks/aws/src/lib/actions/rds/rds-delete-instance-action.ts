import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  dryRunCheckBox,
  getCredentialsForAccount,
  initiateRdsInstanceDeletion,
  parseArn,
  waitForProperties,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

export const rdsDeleteInstanceAction = createAction({
  auth: amazonAuth,
  name: 'rds_delete_instance',
  description: 'Delete the provided RDS Instance',
  displayName: 'RDS Delete Instance',
  riskLevel: RiskLevel.HIGH,
  requireToolApproval: false,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      description: 'The ARN of the RDS Instance to delete',
      required: true,
    }),
    takeSnapshot: Property.Checkbox({
      displayName: 'Take Snapshot',
      description: 'Take a final snapshot before deleting the instance',
      required: false,
      defaultValue: false,
    }),
    snapshotIdentifierProperty: Property.DynamicProperties({
      displayName: '',
      required: false,
      refreshers: ['takeSnapshot'],
      props: async ({ takeSnapshot }) => {
        if (!takeSnapshot) {
          return {};
        }
        const result: any = {
          snapshotIdentifier: Property.ShortText({
            displayName: 'Snapshot Identifier',
            description: 'Unique name for the final snapshot',
            required: true,
          }),
        };
        return result;
      },
    }),
    ...waitForProperties(),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    const {
      arn,
      takeSnapshot,
      waitForTimeInSecondsProperty,
      dryRun,
      snapshotIdentifierProperty,
    } = context.propsValue;

    if (dryRun) {
      return 'Step execution skipped, dry run flag enabled';
    }

    const { region, resourceId, accountId } = parseArn(arn);
    const waitForInSeconds =
      waitForTimeInSecondsProperty['waitForTimeInSeconds'];
    const credentials = await getCredentialsForAccount(context.auth, accountId);

    const snapshotIdentifier = snapshotIdentifierProperty?.snapshotIdentifier;
    const finalSnapshotIdentifier = snapshotIdentifier?.trim();

    const result = await initiateRdsInstanceDeletion(
      credentials,
      region,
      resourceId,
      takeSnapshot,
      waitForInSeconds,
      finalSnapshotIdentifier,
    );

    return result;
  },
});
