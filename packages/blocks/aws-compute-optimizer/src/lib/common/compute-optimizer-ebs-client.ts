import { EBSFinding } from '@aws-sdk/client-compute-optimizer';
import {
  formatAwsError,
  getAccountId,
  groupARNsByRegion,
  parseArn,
  type FailedRegion,
  type PartialResult,
} from '@openops/common';
import { EbsRecommendationsBuilder } from './ebs-recommendations-builder';
import { ComputeOptimizerRecommendation } from './get-recommendations';

export async function getEbsRecommendationsForRegions(
  credentials: any,
  findingType: EBSFinding,
  regions: string[],
): Promise<ComputeOptimizerRecommendation[]> {
  const result: ComputeOptimizerRecommendation[] = [];

  const recommendationType = getRecommendationType(findingType);
  const recommendationsBuilder = new EbsRecommendationsBuilder(
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

export async function getEbsRecommendationsForRegionsAllowPartial(
  credentials: any,
  findingType: EBSFinding,
  regions: string[],
): Promise<PartialResult<ComputeOptimizerRecommendation>> {
  const accountId = await getAccountId(credentials, regions[0]);
  const recommendationType = getRecommendationType(findingType);
  const recommendationsBuilder = new EbsRecommendationsBuilder(
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

export async function getEbsRecommendationsForARNs(
  credentials: any,
  findingType: EBSFinding,
  arns: string[],
): Promise<ComputeOptimizerRecommendation[]> {
  const result: ComputeOptimizerRecommendation[] = [];
  const arnsPerRegion = groupARNsByRegion(arns);

  const recommendationType = getRecommendationType(findingType);
  const recommendationsBuilder = new EbsRecommendationsBuilder(
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

export async function getEbsRecommendationsForARNsAllowPartial(
  credentials: any,
  findingType: EBSFinding,
  arns: string[],
): Promise<PartialResult<ComputeOptimizerRecommendation>> {
  const arnsPerRegion = groupARNsByRegion(arns);
  const regionEntries = Object.entries(arnsPerRegion);

  const accountId = parseArn(arns[0]).accountId;
  const recommendationType = getRecommendationType(findingType);
  const recommendationsBuilder = new EbsRecommendationsBuilder(
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

function getRecommendationType(findingType: EBSFinding): string {
  if (findingType === EBSFinding.OPTIMIZED) {
    return 'UpgradeEbsVolumeGeneration';
  }

  // All others AWS findings are related to volumes rightsizing
  // TODO: Differentiate between over and under provisioned volumes ?
  return 'RightSizeEbsVolume';
}
