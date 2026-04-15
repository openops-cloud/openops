import {
  ComputeOptimizerClient,
  GetRecommendationSummariesCommand,
  RecommendationSummary,
} from '@aws-sdk/client-compute-optimizer';
import {
  formatAwsError,
  getAccountId,
  getAwsClient,
  makeAwsRequest,
  type FailedRegion,
  type PartialResult,
} from '@openops/common';

export async function getRecommendationSummaries(
  credentials: any,
  regions: string[],
): Promise<RecommendationSummary[]> {
  const results: RecommendationSummary[] = [];

  for (const region of regions) {
    const regionalResults = await fetchRecommendationSummariesForRegion(
      credentials,
      region,
    );
    results.push(...regionalResults);
  }

  return results;
}

export async function getRecommendationSummariesAllowPartial(
  credentials: any,
  regions: string[],
): Promise<PartialResult<RecommendationSummary>> {
  const accountId = await getAccountId(credentials, regions[0]);
  const settled = await Promise.allSettled(
    regions.map((region) =>
      fetchRecommendationSummariesForRegion(credentials, region),
    ),
  );

  const results: RecommendationSummary[] = [];
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

async function fetchRecommendationSummariesForRegion(
  credentials: any,
  region: string,
): Promise<RecommendationSummary[]> {
  const results: RecommendationSummary[] = [];
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

  return results;
}

export function getComputeOptimizerClient(
  credentials: any,
  region: string,
): ComputeOptimizerClient {
  return getAwsClient(ComputeOptimizerClient, credentials, region);
}
