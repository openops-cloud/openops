const CREDENTIALS = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  sessionToken: 'some sessionToken',
};

const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  getAccountName: jest.fn(),
  getAwsClient: jest.fn(),
  makeAwsRequest: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

import {
  GetRecommendationSummariesCommandOutput,
  RecommendationSourceType,
  RecommendationSummary,
} from '@aws-sdk/client-compute-optimizer';
import { getRecommendationSummaries } from '../src/lib/common/compute-optimizer-client';

describe('Get recommendations summary', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should return recommendations summary', async () => {
    const summaryOfRegion1 = createRecommendationsSummaryResponse([
      {
        recommendationResourceType: RecommendationSourceType.EBS_VOLUME,
      },
      {
        recommendationResourceType: RecommendationSourceType.ECS_SERVICE,
      },
    ]);
    const summaryOfRegion2 = createRecommendationsSummaryResponse(undefined);
    const summaryOfRegion3 = createRecommendationsSummaryResponse([]);
    const summaryOfRegion4 = createRecommendationsSummaryResponse([
      {
        recommendationResourceType: RecommendationSourceType.LAMBDA_FUNCTION,
      },
    ]);

    openopsCommonMock.makeAwsRequest
      .mockResolvedValueOnce([summaryOfRegion1])
      .mockResolvedValueOnce([summaryOfRegion2])
      .mockResolvedValueOnce([summaryOfRegion3])
      .mockResolvedValueOnce([summaryOfRegion4]);

    const recommendations = await getRecommendationSummaries(CREDENTIALS, [
      'region1',
      'region2',
      'region3',
      'region4',
    ]);

    expect(openopsCommonMock.makeAwsRequest).toHaveBeenCalledTimes(4);

    expect(recommendations.length).toBe(3);
    expect(
      recommendations.map((result) => result.recommendationResourceType),
    ).toEqual([
      RecommendationSourceType.EBS_VOLUME,
      RecommendationSourceType.ECS_SERVICE,
      RecommendationSourceType.LAMBDA_FUNCTION,
    ]);
    expect(openopsCommonMock.getAwsClient).toHaveBeenCalledTimes(4);
  });

  test('should flatten recommendation summary', async () => {
    const summaryOfRegionFirstPage = createRecommendationsSummaryResponse([
      {
        recommendationResourceType: RecommendationSourceType.EBS_VOLUME,
      },
      {
        recommendationResourceType: RecommendationSourceType.ECS_SERVICE,
      },
    ]);

    const summaryOfRegionSecondPage = createRecommendationsSummaryResponse([
      {
        recommendationResourceType: RecommendationSourceType.LAMBDA_FUNCTION,
      },
    ]);

    summaryOfRegionFirstPage.nextToken = 'token';
    openopsCommonMock.makeAwsRequest.mockResolvedValueOnce([
      summaryOfRegionFirstPage,
      summaryOfRegionSecondPage,
    ]);

    const recommendations = await getRecommendationSummaries(CREDENTIALS, [
      'region1',
    ]);

    expect(openopsCommonMock.makeAwsRequest).toHaveBeenCalledTimes(1);

    expect(recommendations.length).toBe(3);
    expect(
      recommendations.map((result) => result.recommendationResourceType),
    ).toEqual([
      RecommendationSourceType.EBS_VOLUME,
      RecommendationSourceType.ECS_SERVICE,
      RecommendationSourceType.LAMBDA_FUNCTION,
    ]);
    expect(openopsCommonMock.getAwsClient).toHaveBeenCalledTimes(1);
  });

  test('should return empty array when there are no regions', async () => {
    const recommendations = await getRecommendationSummaries(CREDENTIALS, []);

    expect(openopsCommonMock.makeAwsRequest).toHaveBeenCalledTimes(0);
    expect(recommendations.length).toBe(0);
  });

  test('should return empty array when there are no recommendations', async () => {
    openopsCommonMock.makeAwsRequest.mockResolvedValueOnce([
      createRecommendationsSummaryResponse([]),
    ]);

    const recommendations = await getRecommendationSummaries(CREDENTIALS, [
      'region1',
    ]);

    expect(openopsCommonMock.makeAwsRequest).toHaveBeenCalledTimes(1);
    expect(recommendations.length).toBe(0);
    expect(openopsCommonMock.getAwsClient).toHaveBeenCalledTimes(1);
  });

  test('should append region to each recommendation summary', async () => {
    const summaryOfRegion1 = createRecommendationsSummaryResponse([
      {
        recommendationResourceType: RecommendationSourceType.EBS_VOLUME,
      },
      {
        recommendationResourceType: RecommendationSourceType.ECS_SERVICE,
      },
    ]);

    const summaryOfRegion2 = createRecommendationsSummaryResponse([
      {
        recommendationResourceType: RecommendationSourceType.LAMBDA_FUNCTION,
      },
    ]);

    openopsCommonMock.makeAwsRequest
      .mockResolvedValueOnce([summaryOfRegion1])
      .mockResolvedValueOnce([summaryOfRegion2]);

    const recommendations: any[] = await getRecommendationSummaries(
      CREDENTIALS,
      ['region1', 'region2'],
    );

    expect(recommendations.length).toBe(3);
    expect(recommendations.map((result) => result.region)).toEqual([
      'region1',
      'region1',
      'region2',
    ]);
    expect(openopsCommonMock.getAwsClient).toHaveBeenCalledTimes(2);
  });
});

function createRecommendationsSummaryResponse(
  summaries: Partial<RecommendationSummary>[] | undefined,
): Partial<GetRecommendationSummariesCommandOutput> {
  return {
    recommendationSummaries: summaries,
  };
}
