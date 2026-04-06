import * as EC2 from '@aws-sdk/client-ec2';
import * as ArnParser from '@aws-sdk/util-arn-parser';
import { fetchArraysAcrossRegions } from '../fetch-arrays-across-regions';
import { getAwsClient } from '../get-client';
import { getAccountName } from '../organizations-common';
import { getAccountId } from '../sts-common';

export async function getEbsVolumes(
  credentials: any,
  regions: [string, ...string[]],
  dryRun: boolean,
  filters?: EC2.Filter[] | undefined,
): Promise<any[]> {
  const accountId = await getAccountId(credentials, regions[0]);
  const accountName = await getAccountName(credentials, regions[0], accountId);

  const fetchVolumesInRegion = async (region: string): Promise<any[]> => {
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
  };

  return fetchArraysAcrossRegions(regions, fetchVolumesInRegion);
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
