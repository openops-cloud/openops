import * as EC2 from '@aws-sdk/client-ec2';
import { SnapshotState } from '@aws-sdk/client-ec2';
import { waitForConditionWithTimeout } from '../../condition-watcher';
import { AwsCredentials } from '../auth';
import { getAwsClient } from '../get-client';

export async function createEbsSnapshot(params: CreateEbsSnapshotParams) {
  const ec2 = getAwsClient(
    EC2.EC2,
    params.credentials,
    params.region,
  ) as EC2.EC2;

  const snapshotParams: EC2.CreateSnapshotRequest = {
    VolumeId: params.volumeId,
    Description: params.description,
    DryRun: params.dryRun,
  };

  const snapshotResult = await ec2.createSnapshot(snapshotParams);
  if (!snapshotResult.SnapshotId) {
    throw new Error(`Snapshot creation failed with error: ${snapshotResult}`);
  }

  const snapshotId: string = snapshotResult.SnapshotId;
  let snapshotStatusResult: EC2.DescribeSnapshotsResult = {};

  if (params.waitForInSeconds) {
    await waitForConditionWithTimeout(
      async () => {
        snapshotStatusResult = await ec2.describeSnapshots({
          SnapshotIds: [snapshotId],
          DryRun: params.dryRun,
        });
        const snapshotStatus = snapshotStatusResult.Snapshots?.[0].State;
        if (snapshotStatus === SnapshotState.error) {
          throw new Error(
            `Snapshot creation failed with error: ${snapshotStatusResult.Snapshots?.[0].StateMessage}`,
          );
        }
        return snapshotStatus === SnapshotState.completed;
      },
      params.waitForInSeconds,
      2000,
      `Snapshot creation timed out`,
    );

    return snapshotStatusResult.Snapshots![0];
  }

  return snapshotResult;
}

interface CreateEbsSnapshotParams {
  credentials: AwsCredentials;
  volumeId: string;
  region: string;
  description?: string;
  waitForInSeconds?: number;
  dryRun: boolean;
}
