import * as EC2 from '@aws-sdk/client-ec2';
import * as ArnParser from '@aws-sdk/util-arn-parser';
import { getAwsClient } from '../get-client';
import { getAccountName } from '../organizations-common';
import {
  type FailedRegion,
  formatAwsError,
  type PartialResult,
} from '../partial-result';
import { getAccountId } from '../sts-common';

async function fetchVolumesInRegion(
  credentials: any,
  region: string,
  dryRun: boolean,
  filters: EC2.Filter[] | undefined,
  accountId: string,
  accountName?: string,
): Promise<any[]> {
  const ec2 = getAwsClient(EC2.EC2, credentials, region) as EC2.EC2;

  const command = new EC2.DescribeVolumesCommand({
    Filters: filters,
    DryRun: dryRun,
  });
  const { Volumes } = await ec2.send(command);

  return (
    Volumes?.map((volume) =>
      mapVolumeToOpenOpsVolume(volume, region, accountId, accountName),
    ) || []
  );
}

export async function getEbsVolumes(
  credentials: any,
  regions: [string, ...string[]],
  dryRun: boolean,
  filters?: EC2.Filter[] | undefined,
): Promise<any[]> {
  const accountId = await getAccountId(credentials, regions[0]);
  const accountName = await getAccountName(credentials, regions[0], accountId);

  const volumesFromAllRegions = await Promise.all(
    regions.map((region) =>
      fetchVolumesInRegion(
        credentials,
        region,
        dryRun,
        filters,
        accountId,
        accountName,
      ),
    ),
  );
  return volumesFromAllRegions.flat();
}

export async function getEbsVolumesAllowPartial(
  credentials: any,
  regions: [string, ...string[]],
  dryRun: boolean,
  filters?: EC2.Filter[] | undefined,
): Promise<PartialResult<any>> {
  const accountId = await getAccountId(credentials, regions[0]);
  const accountName = await getAccountName(credentials, regions[0], accountId);

  const settled = await Promise.allSettled(
    regions.map((region) =>
      fetchVolumesInRegion(
        credentials,
        region,
        dryRun,
        filters,
        accountId,
        accountName,
      ),
    ),
  );

  const results: any[] = [];
  const failedRegions: FailedRegion[] = [];

  settled.forEach((outcome, index) => {
    const region = regions[index];
    if (outcome.status === 'fulfilled') {
      results.push(...outcome.value);
    } else {
      failedRegions.push({
        region,
        accountId,
        error: formatAwsError(outcome.reason),
      });
    }
  });

  return { results, failedRegions };
}

function mapVolumeToOpenOpsVolume(
  volume: EC2.Volume,
  region: string,
  accountId: string,
  accountName?: string,
): any {
  const arn = ArnParser.build({
    accountId,
    service: 'ec2',
    region,
    resource: 'volume/' + volume.VolumeId,
  });

  return {
    ...volume,
    account_id: accountId,
    account_name: accountName,
    arn,
    region,
    volume_id: volume.VolumeId!,
    volume_type: volume.VolumeType!,
    size: volume.Size!,
    displayName: volume.Tags?.find((tag) => tag.Key === 'Name')?.Value,
  };
}
