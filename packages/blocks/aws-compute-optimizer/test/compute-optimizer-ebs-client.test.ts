const CREDENTIALS = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  sessionToken: 'some sessionToken',
};

const sendMock = jest.fn();

const computeOptimizerMock = {
  getComputeOptimizerClient: jest.fn(),
};

jest.mock(
  '../src/lib/common/compute-optimizer-client',
  () => computeOptimizerMock,
);

import {
  EBSFinding,
  VolumeRecommendation,
} from '@aws-sdk/client-compute-optimizer';
import { VolumeType } from '@aws-sdk/client-ec2';
import {
  getEbsRecommendationsForARNs,
  getEbsRecommendationsForRegions,
} from '../src/lib/common/compute-optimizer-ebs-client';

jest.mock('@openops/common', () => ({
  ...jest.requireActual('@openops/common'),
  makeAwsRequest: sendMock,
}));

describe('Get ebs volumes recommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return all the Ebs Volumes Recommendations of the given type for the region making two requests', async () => {
    const findingType = EBSFinding.NOT_OPTIMIZED;
    const recommendationsFirstPage = createRecommendationsResponse(
      [
        createRecommendations(
          'arn:aws:ec2:us-east-2:123456789123:volume/vol-1',
          findingType,
        ),
      ],
      'new token',
    );
    const recommendationsSecondPage = createRecommendationsResponse([
      createRecommendations(
        'arn:aws:ec2:us-east-2:123456789123:volume/vol-2',
        findingType,
      ),
      createRecommendations(
        'arn:aws:ec2:us-east-2:123456789123:volume/vol-3',
        findingType,
      ),
    ]);

    sendMock.mockResolvedValueOnce([
      recommendationsFirstPage,
      recommendationsSecondPage,
    ]);

    const recommendations = await getEbsRecommendationsForRegions(
      CREDENTIALS,
      findingType,
      ['us-east-2'],
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      computeOptimizerMock.getComputeOptimizerClient(),
      createEbsVolumeRecommendationsCommandForAssertion(findingType),
    );

    expect(recommendations.length).toBe(3);
    const expectedIds = [
      'arn:aws:ec2:us-east-2:123456789123:volume/vol-1',
      'arn:aws:ec2:us-east-2:123456789123:volume/vol-2',
      'arn:aws:ec2:us-east-2:123456789123:volume/vol-3',
    ];
    expect(recommendations.map((result) => result.arn)).toEqual(expectedIds);
    expect(
      new Set(recommendations.map((result) => result.recommendation.type)),
    ).toEqual(new Set(['RightSizeEbsVolume']));
  });

  test('should return all the Ebs Volumes Recommendations of the given type for the regions', async () => {
    const findingType = EBSFinding.NOT_OPTIMIZED;
    const recommendationsInRegion1 = createRecommendationsResponse([
      createRecommendations(
        'arn:aws:ec2:us-east-2:123456789123:volume/vol-1',
        findingType,
      ),
    ]);
    const recommendationsInRegion2 = createRecommendationsResponse([
      createRecommendations(
        'arn:aws:ec2:us-east-1:123456789123:volume/vol-2',
        findingType,
      ),
      createRecommendations(
        'arn:aws:ec2:us-east-1:123456789123:volume/vol-3',
        findingType,
      ),
    ]);
    const recommendationsInRegion3 = createRecommendationsResponse([]);

    sendMock
      .mockResolvedValueOnce([recommendationsInRegion1])
      .mockResolvedValueOnce([recommendationsInRegion2])
      .mockResolvedValueOnce([recommendationsInRegion3]);

    const recommendations = await getEbsRecommendationsForRegions(
      CREDENTIALS,
      findingType,
      ['us-east-2', 'us-east-1', 'eu-central-1'],
    );

    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(sendMock).toHaveBeenCalledWith(
      computeOptimizerMock.getComputeOptimizerClient(),
      createEbsVolumeRecommendationsCommandForAssertion(findingType),
    );
    expect(sendMock).toHaveBeenCalledWith(
      computeOptimizerMock.getComputeOptimizerClient(),
      createEbsVolumeRecommendationsCommandForAssertion(findingType),
    );
    expect(sendMock).toHaveBeenCalledWith(
      computeOptimizerMock.getComputeOptimizerClient(),
      createEbsVolumeRecommendationsCommandForAssertion(findingType),
    );

    expect(recommendations.length).toBe(3);
    const expectedIds = [
      'arn:aws:ec2:us-east-2:123456789123:volume/vol-1',
      'arn:aws:ec2:us-east-1:123456789123:volume/vol-2',
      'arn:aws:ec2:us-east-1:123456789123:volume/vol-3',
    ];
    expect(recommendations.map((result) => result.arn)).toEqual(expectedIds);
    expect(
      new Set(recommendations.map((result) => result.recommendation.type)),
    ).toEqual(new Set(['RightSizeEbsVolume']));
  });

  test('should return an empty array when the regions have no recommendations', async () => {
    sendMock.mockResolvedValueOnce([]);

    const recommendations = await getEbsRecommendationsForRegions(
      CREDENTIALS,
      EBSFinding.OPTIMIZED,
      ['us-east-2'],
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(recommendations.length).toBe(0);
  });

  test('should return all the Ebs Volumes Recommendations for the provided volumes', async () => {
    const recommendationsInRegion1 = createRecommendationsResponse([
      createRecommendations('arn:aws:ec2:us-east-1:123456789123:volume/vol-1'),
    ]);
    const recommendationsInRegion2 = createRecommendationsResponse([
      createRecommendations('arn:aws:ec2:us-east-2:123456789123:volume/vol-2'),
      createRecommendations('arn:aws:ec2:us-east-2:123456789123:volume/vol-3'),
    ]);
    const recommendationsInRegion3 = createRecommendationsResponse([]);

    sendMock
      .mockResolvedValueOnce([recommendationsInRegion1])
      .mockResolvedValueOnce([recommendationsInRegion2])
      .mockResolvedValueOnce([recommendationsInRegion3]);

    const arns: string[] = [
      'arn:aws:ec2:us-east-1:123456789123:volume/vol-1',
      'arn:aws:ec2:us-east-2:123456789123:volume/vol-2',
      'arn:aws:ec2:us-east-2:123456789123:volume/vol-3',
    ];

    const recommendations = await getEbsRecommendationsForARNs(
      CREDENTIALS,
      EBSFinding.OPTIMIZED,
      arns,
    );

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock).toHaveBeenCalledWith(
      computeOptimizerMock.getComputeOptimizerClient(),
      createEbsVolumeRecommendationsCommandForAssertion(EBSFinding.OPTIMIZED, [
        'arn:aws:ec2:us-east-1:123456789123:volume/vol-1',
      ]),
    );
    expect(sendMock).toHaveBeenCalledWith(
      computeOptimizerMock.getComputeOptimizerClient(),
      createEbsVolumeRecommendationsCommandForAssertion(EBSFinding.OPTIMIZED, [
        'arn:aws:ec2:us-east-2:123456789123:volume/vol-2',
        'arn:aws:ec2:us-east-2:123456789123:volume/vol-3',
      ]),
    );
    expect(recommendations.map((result) => result.arn)).toEqual(arns);
    expect(
      new Set(recommendations.map((result) => result.recommendation.type)),
    ).toEqual(new Set(['UpgradeEbsVolumeGeneration']));
  });

  test('should return an empty array when the provided volumes have no recommendations', async () => {
    sendMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const arns: string[] = [
      'arn:aws:ec2:us-east-1:123456789123:volume/vol-1',
      'arn:aws:ec2:us-east-2:123456789123:volume/vol-2',
      'arn:aws:ec2:us-east-2:123456789123:volume/vol-3',
    ];

    const recommendations = await getEbsRecommendationsForARNs(
      CREDENTIALS,
      EBSFinding.NOT_OPTIMIZED,
      arns,
    );

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(recommendations.length).toBe(0);
  });

  test('should return an empty array when the given volumes have 0 savings recommendations', async () => {
    const findingType = EBSFinding.OPTIMIZED;
    const recommendationZeroSaving = createRecommendations(
      'arn:aws:ec2:us-east-1:123456789123:volume/vol-1',
      findingType,
    );
    const recommendationNoSavingObj = createRecommendations(
      'arn:aws:ec2:us-east-2:123456789123:volume/vol-2',
      findingType,
    );

    recommendationZeroSaving.volumeRecommendationOptions![0].savingsOpportunity!.estimatedMonthlySavings!.value = 0;
    recommendationNoSavingObj.volumeRecommendationOptions![0].savingsOpportunity =
      undefined;

    sendMock
      .mockResolvedValueOnce([
        createRecommendationsResponse([recommendationZeroSaving]),
      ])
      .mockResolvedValueOnce([
        createRecommendationsResponse([recommendationNoSavingObj]),
      ]);

    const arns: string[] = [
      'arn:aws:ec2:us-east-1:123456789123:volume/vol-1',
      'arn:aws:ec2:us-east-2:123456789123:volume/vol-2',
    ];

    const recommendations = await getEbsRecommendationsForARNs(
      CREDENTIALS,
      EBSFinding.OPTIMIZED,
      arns,
    );

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(recommendations.length).toBe(0);
  });
});

function createRecommendationsResponse(
  volumeRecommendations: VolumeRecommendation[],
  nextToken?: string,
): { volumeRecommendations: VolumeRecommendation[]; nextToken?: string } {
  return {
    volumeRecommendations: volumeRecommendations,
    nextToken: nextToken,
  };
}

function createRecommendations(
  arn: string,
  finding?: EBSFinding,
): VolumeRecommendation {
  return {
    accountId: 'accountId',
    finding: finding || EBSFinding.OPTIMIZED,
    volumeArn: arn,
    currentConfiguration: {
      volumeType: VolumeType.gp2,
      volumeSize: 30,
    },
    volumeRecommendationOptions: [
      {
        savingsOpportunity: {
          estimatedMonthlySavings: {
            currency: 'USD',
            value: 0.4,
          },
        },
      },
    ],
  };
}

function createEbsVolumeRecommendationsCommandForAssertion(
  findingType: EBSFinding,
  volumeArns?: string[],
) {
  return expect.objectContaining({
    input: {
      volumeArns: volumeArns,
      filters: [{ name: 'Finding', values: [findingType] }],
    },
  });
}
