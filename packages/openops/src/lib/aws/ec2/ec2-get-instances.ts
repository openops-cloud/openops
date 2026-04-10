import * as EC2 from '@aws-sdk/client-ec2';
import * as ArnParser from '@aws-sdk/util-arn-parser';
import { fetchArraysAcrossRegions } from '../fetch-arrays-across-regions';
import { getAwsClient } from '../get-client';
import { getAccountName } from '../organizations-common';
import { getAccountId } from '../sts-common';

export async function getEc2Instances(
  credentials: any,
  regions: [string, ...string[]],
  dryRun: boolean,
  filters?: EC2.Filter[],
): Promise<any[]> {
  const accountId = await getAccountId(credentials, regions[0]);
  const accountName = await getAccountName(credentials, regions[0], accountId);

  const fetchInstancesInRegion = async (region: string): Promise<any[]> => {
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
  };

  return fetchArraysAcrossRegions(regions, fetchInstancesInRegion);
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
