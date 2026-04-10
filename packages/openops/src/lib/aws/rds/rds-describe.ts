import * as RDS from '@aws-sdk/client-rds';
import { fetchArraysAcrossRegions } from '../fetch-arrays-across-regions';
import { getAwsClient } from '../get-client';

export async function describeRdsSnapshots(
  credentials: any,
  regions: [string, ...string[]],
  filters?: RDS.Filter[] | undefined,
): Promise<RDS.DBSnapshot[]> {
  const fetchSnapshotsInRegion = async (region: string): Promise<any[]> => {
    const client = getAwsClient(RDS.RDS, credentials, region) as RDS.RDS;

    const command = new RDS.DescribeDBSnapshotsCommand({
      Filters: filters,
    });

    const response = await client.send(command);

    return (
      response.DBSnapshots?.map((snapshot) => ({
        ...snapshot,
        region,
      })) || []
    );
  };

  return fetchArraysAcrossRegions(regions, fetchSnapshotsInRegion);
}

export async function describeRdsInstances(
  credentials: any,
  regions: [string, ...string[]],
  filters?: RDS.Filter[] | undefined,
): Promise<RDS.DBInstance[]> {
  const fetchInstancesInRegion = async (region: string): Promise<any[]> => {
    const client = getAwsClient(RDS.RDS, credentials, region) as RDS.RDS;

    const command = new RDS.DescribeDBInstancesCommand({
      Filters: filters,
    });

    const response = await client.send(command);

    return (
      response.DBInstances?.map((instance) => ({
        ...instance,
        region,
      })) || []
    );
  };

  return fetchArraysAcrossRegions(regions, fetchInstancesInRegion);
}
