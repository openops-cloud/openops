import { Finding } from '@aws-sdk/client-compute-optimizer';
import {
  formatAwsError,
  getAccountId,
  groupARNsByRegion,
  parseArn,
  type FailedRegion,
  type PartialResult,
} from '@openops/common';
import { Ec2RecommendationsBuilder } from './ec2-recommendations-builder';
import { ComputeOptimizerRecommendation } from './get-recommendations';

export async function getEC2RecommendationsForRegions(
  credentials: any,
  findingType: Finding,
  regions: string[],
): Promise<ComputeOptimizerRecommendation[]> {
  const result: ComputeOptimizerRecommendation[] = [];

  const recommendationType = getRecommendationType(findingType);
  const recommendationsBuilder = new Ec2RecommendationsBuilder(
    credentials,
    findingType,
    recommendationType,
  );

  for (const region of regions) {
    const recommendations = await recommendationsBuilder.getRecommendations(
      credentials,
      region,
    );

    result.push(...recommendations);
  }

  return result;
}

export async function getEC2RecommendationsForRegionsAllowPartial(
  credentials: any,
  findingType: Finding,
  regions: string[],
): Promise<PartialResult<ComputeOptimizerRecommendation>> {
  const accountId = await getAccountId(credentials, regions[0]);
  const recommendationType = getRecommendationType(findingType);
  const recommendationsBuilder = new Ec2RecommendationsBuilder(
    credentials,
    findingType,
    recommendationType,
  );

  const settled = await Promise.allSettled(
    regions.map((region) =>
      recommendationsBuilder.getRecommendations(credentials, region),
    ),
  );

  const results: ComputeOptimizerRecommendation[] = [];
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

export async function getEC2RecommendationsForARNs(
  credentials: any,
  findingType: Finding,
  arns: string[],
): Promise<ComputeOptimizerRecommendation[]> {
  const result: ComputeOptimizerRecommendation[] = [];

  const arnsPerRegion = groupARNsByRegion(arns);

  const recommendationType = getRecommendationType(findingType);
  const recommendationsBuilder = new Ec2RecommendationsBuilder(
    credentials,
    findingType,
    recommendationType,
  );

  for (const region in arnsPerRegion) {
    const recommendations = await recommendationsBuilder.getRecommendations(
      credentials,
      region,
      arnsPerRegion[region],
    );

    result.push(...recommendations);
  }

  return result;
}

export async function getEC2RecommendationsForARNsAllowPartial(
  credentials: any,
  findingType: Finding,
  arns: string[],
): Promise<PartialResult<ComputeOptimizerRecommendation>> {
  const arnsPerRegion = groupARNsByRegion(arns);
  const regionEntries = Object.entries(arnsPerRegion);

  const accountId = parseArn(arns[0]).accountId;
  const recommendationType = getRecommendationType(findingType);
  const recommendationsBuilder = new Ec2RecommendationsBuilder(
    credentials,
    findingType,
    recommendationType,
  );

  const settled = await Promise.allSettled(
    regionEntries.map(([region, arnsForRegion]) =>
      recommendationsBuilder.getRecommendations(
        credentials,
        region,
        arnsForRegion,
      ),
    ),
  );

  const results: ComputeOptimizerRecommendation[] = [];
  const failedRegions: FailedRegion[] = [];

  settled.forEach((outcome, index) => {
    const region = regionEntries[index][0];
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

function getRecommendationType(findingType: Finding): string {
  if (findingType === Finding.OPTIMIZED) {
    return 'UpgradeEc2InstanceGeneration';
  }

  // All others AWS findings are related to instances rightsizing
  return 'RightSizeEc2Instance';
}
