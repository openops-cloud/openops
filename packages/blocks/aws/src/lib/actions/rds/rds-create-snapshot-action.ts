import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  dryRunCheckBox,
  getCredentialsForAccount,
  initiateRdsSnapshotCreation,
  parseArn,
  waitForProperties,
} from '@openops/common';

export const rdsCreateSnapshotAction = createAction({
  auth: amazonAuth,
  name: 'rds_create_snapshot',
  description: 'Create a snapshot of the provided RDS instance',
  displayName: 'RDS Create Snapshot',
  requireToolApproval: false,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      description:
        'The ARN of the RDS instance for which a snapshot will be created',
      required: true,
    }),
    snapshotId: Property.LongText({
      displayName: 'Snapshot Id',
      description:
        'If not provided, it will be automatically generated using the DB instance ID combined with the current timestamp.',
      required: false,
    }),
    tags: Property.Object({
      displayName: 'Tags',
      description: 'Name and value of the tag to be added',
      required: false,
      defaultValue: { 'Created by': 'OpenOps' },
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
    const tags = context.propsValue['tags'] as Record<string, unknown>;
    const credentials = await getCredentialsForAccount(context.auth, accountId);

    const result = await initiateRdsSnapshotCreation({
      credentials,
      region: region,
      dbInstanceId: resourceId,
      snapshotId: context.propsValue['snapshotId'],
      waitForInSeconds,
      tags: tags,
    });

    return result;
  },
});
