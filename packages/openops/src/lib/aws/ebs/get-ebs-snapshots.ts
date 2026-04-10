import * as EC2 from '@aws-sdk/client-ec2';
import { fetchArraysAcrossRegions } from '../fetch-arrays-across-regions';
import { getAwsClient } from '../get-client';

export async function getEbsSnapshots(
  credentials: any,
  regions: [string, ...string[]],
  dryRun: boolean,
  filters?: EC2.Filter[] | undefined,
): Promise<any[]> {
  const fetchSnapshotsInRegion = async (region: string): Promise<any[]> => {
    const ec2 = getAwsClient(EC2.EC2, credentials, region) as EC2.EC2;

    const command = new EC2.DescribeSnapshotsCommand({
      Filters: filters,
      DryRun: dryRun,
      OwnerIds: ['self'],
    });
    const response = await ec2.send(command);

    return (
      response.Snapshots?.map((snapshot) => ({
        ...snapshot,
        region,
      })) || []
    );
  };

  return fetchArraysAcrossRegions(regions, fetchSnapshotsInRegion);
}
