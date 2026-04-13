import * as EC2 from '@aws-sdk/client-ec2';
import * as ArnParser from '@aws-sdk/util-arn-parser';
import { getAwsClient } from '../get-client';
import { getAccountName } from '../organizations-common';
import { getAccountId } from '../sts-common';

export type AwsPartialFetchFailedRegion = {
  region: string;
  accountId?: string;
  error: string;
};

export type AwsPartialFetchResult<T = unknown> = {
  results: T[];
  failedRegions: AwsPartialFetchFailedRegion[];
};

export function formatAwsPartialFetchError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

async function describeInstancesInRegion(
  credentials: any,
  region: string,
  dryRun: boolean,
  filters: EC2.Filter[] | undefined,
  accountId: string,
  accountName?: string,
): Promise<any[]> {
  const ec2 = getAwsClient(EC2.EC2, credentials, region) as EC2.EC2;

  const command = new EC2.DescribeInstancesCommand({
    Filters: filters,
    DryRun: dryRun,
  });
  const { Reservations } = await ec2.send(command);

  return (
    Reservations?.flatMap(
      (reservation) =>
        reservation.Instances?.map((instance) =>
          mapInstanceToOpenOpsEc2Instance(
            instance,
            region,
            accountId,
            accountName,
          ),
        ) || [],
    ) || []
  );
}

export async function getEc2Instances(
  credentials: any,
  regions: [string, ...string[]],
  dryRun: boolean,
  filters?: EC2.Filter[],
): Promise<any[]> {
  const accountId = await getAccountId(credentials, regions[0]);
  const accountName = await getAccountName(credentials, regions[0], accountId);

  const instancesFromAllRegions = await Promise.all(
    regions.map((region) =>
      describeInstancesInRegion(
        credentials,
        region,
        dryRun,
        filters,
        accountId,
        accountName,
      ),
    ),
  );
  return instancesFromAllRegions.flat();
}

export async function getEc2InstancesWithPartialResults(
  credentials: any,
  regions: [string, ...string[]],
  dryRun: boolean,
  filters?: EC2.Filter[],
): Promise<AwsPartialFetchResult<any>> {
  let accountId: string;
  let accountName: string | undefined;

  try {
    accountId = await getAccountId(credentials, regions[0]);
    accountName = await getAccountName(credentials, regions[0], accountId);
  } catch (error) {
    const message = formatAwsPartialFetchError(error);
    return {
      results: [],
      failedRegions: regions.map((region) => ({
        region,
        error: message,
      })),
    };
  }

  const settled = await Promise.allSettled(
    regions.map((region) =>
      describeInstancesInRegion(
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
  const failedRegions: AwsPartialFetchFailedRegion[] = [];

  settled.forEach((outcome, index) => {
    const region = regions[index];
    if (outcome.status === 'fulfilled') {
      results.push(...outcome.value);
    } else {
      failedRegions.push({
        region,
        accountId,
        error: formatAwsPartialFetchError(outcome.reason),
      });
    }
  });

  return { results, failedRegions };
}

function mapInstanceToOpenOpsEc2Instance(
  instance: EC2.Instance,
  region: string,
  accountId: string,
  accountName?: string,
): any {
  const arn = ArnParser.build({
    accountId,
    service: 'ec2',
    region,
    resource: 'instance/' + instance.InstanceId,
  });

  return {
    ...instance,
    account_id: accountId,
    account_name: accountName,
    arn,
    region,
    instance_id: instance.InstanceId!,
    instance_type: instance.InstanceType!,
    displayName: instance.Tags?.find((tag) => tag.Key === 'Name')?.Value,
  };
}
