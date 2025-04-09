import { createBlock } from '@openops/blocks-framework';
import { amazonAuth, getAccountAlias } from '@openops/common';
import { BlockCategory } from '@openops/shared';
import { addTagsAction } from './lib/actions/add-tags-action';
import { buildArnAction } from './lib/actions/arn/build-arn-action';
import { parseArnAction } from './lib/actions/arn/parse-arn-action';
import { awsCliAction } from './lib/actions/cli/aws-cli-action';
import { ebsCreateSnapshotAction } from './lib/actions/ebs/ebs-create-snapshot-action';
import { ebsDeleteSnapshotAction } from './lib/actions/ebs/ebs-delete-snapshot-action';
import { ebsDeleteVolumeAction } from './lib/actions/ebs/ebs-delete-volume-action';
import { ebsGetSnapshotsAction } from './lib/actions/ebs/ebs-get-snapshot-action';
import { ebsGetVolumesAction } from './lib/actions/ebs/ebs-get-volumes-action';
import { ebsModifyVolumeAction } from './lib/actions/ebs/ebs-modify-volume-action';
import { ec2GetInstancesAction } from './lib/actions/ec2/ec2-get-instances-action';
import { ec2ModifyInstanceAction } from './lib/actions/ec2/ec2-modify-instance-action';
import { ec2StartInstanceAction } from './lib/actions/ec2/ec2-start-instance-action';
import { ec2StopInstanceAction } from './lib/actions/ec2/ec2-stop-instance-action';
import { ec2TerminateInstancesAction } from './lib/actions/ec2/ec2-terminate-instances-action';
import { getAccountIdAction } from './lib/actions/get-account-id-action';
import { getAccountInfoAction } from './lib/actions/get-account-info-action';
import { getPriceAction } from './lib/actions/get-price-action';
import { rdsCreateSnapshotAction } from './lib/actions/rds/rds-create-snapshot-action';
import { rdsDeleteInstanceAction } from './lib/actions/rds/rds-delete-instance-action';
import { rdsDeleteSnapshotAction } from './lib/actions/rds/rds-delete-snapshot-action';
import { rdsGetInstancesAction } from './lib/actions/rds/rds-describe-instances-action';
import { rdsGetSnapshotsAction } from './lib/actions/rds/rds-describe-snapshots-action';

export const aws = createBlock({
  displayName: 'AWS',
  logoUrl: 'https://static.openops.com/blocks/aws.png',
  minimumSupportedRelease: '0.8.0',
  authors: ['OpenOps'],
  auth: amazonAuth,
  categories: [BlockCategory.CLOUD],
  actions: [
    buildArnAction,
    parseArnAction,
    getPriceAction,
    getAccountIdAction,
    getAccountAlias(),
    getAccountInfoAction,
    ebsGetVolumesAction,
    ebsModifyVolumeAction,
    ebsDeleteVolumeAction,
    ebsGetSnapshotsAction,
    ebsCreateSnapshotAction,
    ebsDeleteSnapshotAction,
    ec2GetInstancesAction,
    ec2ModifyInstanceAction,
    ec2StartInstanceAction,
    ec2StopInstanceAction,
    ec2TerminateInstancesAction,
    rdsGetInstancesAction,
    rdsDeleteInstanceAction,
    rdsGetSnapshotsAction,
    rdsCreateSnapshotAction,
    rdsDeleteSnapshotAction,
    addTagsAction,
    awsCliAction,
  ],
  triggers: [],
});
