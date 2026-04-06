import {
  ComputeOptimizerClient,
  GetRecommendationSummariesCommand,
  RecommendationSummary,
} from '@aws-sdk/client-compute-optimizer';
import {
  getAwsClient,
  isAwsPermissionError,
  makeAwsRequest,
} from '@openops/common';
import { logger } from '@openops/server-shared';

export async function getRecommendationSummaries(
  credentials: any,
  regions: string[],
): Promise<RecommendationSummary[]> {
  const results: RecommendationSummary[] = [];

  for (const region of regions) {
    try {
      const client = getComputeOptimizerClient(credentials, region);
      const command = new GetRecommendationSummariesCommand({
        nextToken: '',
      });
      const regionalResults = await makeAwsRequest(client, command);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const result of regionalResults as any) {
        const recommendationSummaries = result.recommendationSummaries?.map(
          (item: any) => ({ ...item, region }),
        );

        if (recommendationSummaries) {
          results.push(...recommendationSummaries);
        }
      }
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

  return results;
}

export function getComputeOptimizerClient(
  credentials: any,
  region: string,
): ComputeOptimizerClient {
  return getAwsClient(ComputeOptimizerClient, credentials, region);
}
