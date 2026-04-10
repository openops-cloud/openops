import { Finding } from '@aws-sdk/client-compute-optimizer';
import { groupARNsByRegion, isAwsPermissionError } from '@openops/common';
import { logger } from '@openops/server-shared';
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

function getRecommendationType(findingType: Finding): string {
  if (findingType === Finding.OPTIMIZED) {
    return 'UpgradeEc2InstanceGeneration';
  }

  // All others AWS findings are related to instances rightsizing
  return 'RightSizeEc2Instance';
}
