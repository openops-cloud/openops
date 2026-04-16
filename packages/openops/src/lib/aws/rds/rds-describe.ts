import * as RDS from '@aws-sdk/client-rds';
import { getAwsClient } from '../get-client';
import {
  type FailedRegion,
  formatAwsError,
  type PartialResult,
} from '../partial-result';
import { getAccountId } from '../sts-common';

async function fetchSnapshotsInRegion(
  credentials: any,
  region: string,
  filters?: RDS.Filter[],
): Promise<RDS.DBSnapshot[]> {
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
}

export async function describeRdsSnapshots(
  credentials: any,
  regions: [string, ...string[]],
  filters?: RDS.Filter[] | undefined,
): Promise<RDS.DBSnapshot[]> {
  const snapshotsFromAllRegions = await Promise.all(
    regions.map((region) =>
      fetchSnapshotsInRegion(credentials, region, filters),
    ),
  );
  return snapshotsFromAllRegions.flat();
}

export async function describeRdsSnapshotsAllowPartial(
  credentials: any,
  regions: [string, ...string[]],
  filters?: RDS.Filter[] | undefined,
): Promise<PartialResult<RDS.DBSnapshot>> {
  const accountId = await getAccountId(credentials, regions[0]);

  const settled = await Promise.allSettled(
    regions.map((region) =>
      fetchSnapshotsInRegion(credentials, region, filters),
    ),
  );

  const results: RDS.DBSnapshot[] = [];
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

async function fetchInstancesInRegion(
  credentials: any,
  region: string,
  filters?: RDS.Filter[],
): Promise<RDS.DBInstance[]> {
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
}

export async function describeRdsInstances(
  credentials: any,
  regions: [string, ...string[]],
  filters?: RDS.Filter[] | undefined,
): Promise<RDS.DBInstance[]> {
  const instancesFromAllRegions = await Promise.all(
    regions.map((region) =>
      fetchInstancesInRegion(credentials, region, filters),
    ),
  );
  return instancesFromAllRegions.flat();
}

export async function describeRdsInstancesAllowPartial(
  credentials: any,
  regions: [string, ...string[]],
  filters?: RDS.Filter[] | undefined,
): Promise<PartialResult<RDS.DBInstance>> {
  const accountId = await getAccountId(credentials, regions[0]);

  const settled = await Promise.allSettled(
    regions.map((region) =>
      fetchInstancesInRegion(credentials, region, filters),
    ),
  );

  const results: RDS.DBInstance[] = [];
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
