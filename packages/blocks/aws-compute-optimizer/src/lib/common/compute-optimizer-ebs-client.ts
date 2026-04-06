import { EBSFinding } from '@aws-sdk/client-compute-optimizer';
import { groupARNsByRegion, isAwsPermissionError } from '@openops/common';
import { logger } from '@openops/server-shared';
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
    try {
      const recommendations = await recommendationsBuilder.getRecommendations(
        credentials,
        region,
      );

      result.push(...recommendations);
    } catch (error) {
      if (isAwsPermissionError(error)) {
        logger.debug('Skipping AWS region due to permission error', {
          region,
          error,
        });
        continue;
      }

      throw error;
    }
  }

  return result;
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
    try {
      const recommendations = await recommendationsBuilder.getRecommendations(
        credentials,
        region,
        arnsPerRegion[region],
      );

      result.push(...recommendations);
    } catch (error) {
      if (isAwsPermissionError(error)) {
        logger.debug('Skipping AWS region due to permission error', {
          region,
          error,
        });
        continue;
      }

      throw error;
    }
  }

  return result;
}

function getRecommendationType(findingType: EBSFinding): string {
  if (findingType === EBSFinding.OPTIMIZED) {
    return 'UpgradeEbsVolumeGeneration';
  }

  // All others AWS findings are related to volumes rightsizing
  // TODO: Differentiate between over and under provisioned volumes ?
  return 'RightSizeEbsVolume';
}
