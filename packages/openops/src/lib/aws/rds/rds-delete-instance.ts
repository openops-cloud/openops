import * as RDS from '@aws-sdk/client-rds';
import { waitForConditionWithTimeout } from '../../condition-watcher';
import { AwsCredentials } from '../auth';
import { getAwsClient } from '../get-client';
import { describeRdsInstances } from './rds-describe';

export async function initiateRdsInstanceDeletion(
  credentials: AwsCredentials,
  region: string,
  instanceId: string,
  createSnapshot: boolean,
  waitForInSeconds?: number,
  finalSnapshotIdentifier?: string,
) {
  const client = getAwsClient(RDS.RDS, credentials, region) as RDS.RDS;
  try {
    const commandInput: RDS.DeleteDBInstanceCommandInput = {
      DBInstanceIdentifier: instanceId,
      SkipFinalSnapshot: !createSnapshot,
    };

    if (createSnapshot && finalSnapshotIdentifier) {
      commandInput.FinalDBSnapshotIdentifier = finalSnapshotIdentifier;
    }

    const command = new RDS.DeleteDBInstanceCommand(commandInput);

    const initiateDeletion = await client.send(command);

    if (waitForInSeconds) {
      await waitForConditionWithTimeout(
        async () => {
          const instances = await describeRdsInstances(
            credentials,
            [region],
            [{ Name: 'instance-id', Values: [instanceId] }],
          );
          return !instances.length;
        },
        waitForInSeconds,
        2000,
        `Instance deletion timed out`,
      );
    }

    return initiateDeletion;
  } catch (error: any) {
    throw new Error('Delete RDS Instance failed with error: ' + error.message);
  }
}
