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
  Finding,
  InstanceRecommendation,
} from '@aws-sdk/client-compute-optimizer';
import { _InstanceType } from '@aws-sdk/client-ec2';
import {
  getEC2RecommendationsForARNs,
  getEC2RecommendationsForRegions,
} from '../src/lib/common/compute-optimizer-ec2-client';

jest.mock('@openops/common', () => ({
  ...jest.requireActual('@openops/common'),
  makeAwsRequest: sendMock,
}));

describe('Get ec2 instances recommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return all the EC2 Recommendations of the given type for the regions making two requests', async () => {
    const findingType = Finding.OVER_PROVISIONED;
    const recommendationsFirstPage = createRecommendationsResponse(
      [
        createRecommendations(
          'arn:aws:ec2:us-east-2:123456789123:instance/i-1',
          findingType,
        ),
      ],
      'new token',
    );
    const recommendationsSecondPage = createRecommendationsResponse([
      createRecommendations(
        'arn:aws:ec2:us-east-2:123456789123:instance/i-2',
        findingType,
      ),
      createRecommendations(
        'arn:aws:ec2:us-east-2:123456789123:instance/i-3',
        findingType,
      ),
    ]);

    sendMock.mockResolvedValueOnce([
      recommendationsFirstPage,
      recommendationsSecondPage,
    ]);

    const recommendations = await getEC2RecommendationsForRegions(
      CREDENTIALS,
      findingType,
      ['us-east-2'],
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      computeOptimizerMock.getComputeOptimizerClient(),
      createEC2InstanceRecommendationsCommandForAssertion(findingType),
    );

    expect(recommendations.length).toBe(3);
    const expectedIds = [
      'arn:aws:ec2:us-east-2:123456789123:instance/i-1',
      'arn:aws:ec2:us-east-2:123456789123:instance/i-2',
      'arn:aws:ec2:us-east-2:123456789123:instance/i-3',
    ];
    expect(recommendations.map((result) => result.arn)).toEqual(expectedIds);
    expect(
      new Set(recommendations.map((result) => result.recommendation.type)),
    ).toEqual(new Set(['RightSizeEc2Instance']));
  });

  test('should return all the EC2 Recommendations of the given type for the regions', async () => {
    const findingType = Finding.OVER_PROVISIONED;
    const recommendationsInRegion1 = createRecommendationsResponse([
      createRecommendations(
        'arn:aws:ec2:us-east-2:123456789123:instance/i-1',
        findingType,
      ),
    ]);
    const recommendationsInRegion2 = createRecommendationsResponse([
      createRecommendations(
        'arn:aws:ec2:us-east-2:123456789123:instance/i-2',
        findingType,
      ),
      createRecommendations(
        'arn:aws:ec2:us-east-2:123456789123:instance/i-3',
        findingType,
      ),
    ]);
    const recommendationsInRegion3 = createRecommendationsResponse([]);

    sendMock
      .mockResolvedValueOnce([recommendationsInRegion1])
      .mockResolvedValueOnce([recommendationsInRegion2])
      .mockResolvedValueOnce([recommendationsInRegion3]);

    const recommendations = await getEC2RecommendationsForRegions(
      CREDENTIALS,
      findingType,
      ['us-east-2', 'us-east-1', 'eu-central-1'],
    );

    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(sendMock).toHaveBeenCalledWith(
      computeOptimizerMock.getComputeOptimizerClient(),
      createEC2InstanceRecommendationsCommandForAssertion(findingType),
    );
    expect(sendMock).toHaveBeenCalledWith(
      computeOptimizerMock.getComputeOptimizerClient(),
      createEC2InstanceRecommendationsCommandForAssertion(findingType),
    );
    expect(sendMock).toHaveBeenCalledWith(
      computeOptimizerMock.getComputeOptimizerClient(),
      createEC2InstanceRecommendationsCommandForAssertion(findingType),
    );

    expect(recommendations.length).toBe(3);
    const expectedIds = [
      'arn:aws:ec2:us-east-2:123456789123:instance/i-1',
      'arn:aws:ec2:us-east-2:123456789123:instance/i-2',
      'arn:aws:ec2:us-east-2:123456789123:instance/i-3',
    ];
    expect(recommendations.map((result) => result.arn)).toEqual(expectedIds);
    expect(
      new Set(recommendations.map((result) => result.recommendation.type)),
    ).toEqual(new Set(['RightSizeEc2Instance']));
  });

  test('should return an empty array when the regions have no recommendations', async () => {
    sendMock.mockResolvedValueOnce([]);

    const recommendations = await getEC2RecommendationsForRegions(
      CREDENTIALS,
      Finding.OPTIMIZED,
      ['us-east-2'],
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(recommendations.length).toBe(0);
  });

  test('should return all the EC2 Recommendations for the provided instances', async () => {
    const recommendationsInRegion1 = createRecommendationsResponse([
      createRecommendations('arn:aws:ec2:us-east-2:123456789123:instance/i-1'),
    ]);
    const recommendationsInRegion2 = createRecommendationsResponse([
      createRecommendations('arn:aws:ec2:us-east-1:123456789123:instance/i-2'),
      createRecommendations('arn:aws:ec2:us-east-1:123456789123:instance/i-3'),
    ]);
    const recommendationsInRegion3 = createRecommendationsResponse([]);

    sendMock
      .mockResolvedValueOnce([recommendationsInRegion1])
      .mockResolvedValueOnce([recommendationsInRegion2])
      .mockResolvedValueOnce([recommendationsInRegion3]);

    const arns = [
      'arn:aws:ec2:us-east-2:123456789123:instance/i-1',
      'arn:aws:ec2:us-east-1:123456789123:instance/i-2',
      'arn:aws:ec2:us-east-1:123456789123:instance/i-3',
    ];

    const recommendations = await getEC2RecommendationsForARNs(
      CREDENTIALS,
      Finding.OPTIMIZED,
      arns,
    );

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock).toHaveBeenCalledWith(
      computeOptimizerMock.getComputeOptimizerClient(),
      createEC2InstanceRecommendationsCommandForAssertion(Finding.OPTIMIZED, [
        'arn:aws:ec2:us-east-2:123456789123:instance/i-1',
      ]),
    );
    expect(sendMock).toHaveBeenCalledWith(
      computeOptimizerMock.getComputeOptimizerClient(),
      createEC2InstanceRecommendationsCommandForAssertion(Finding.OPTIMIZED, [
        'arn:aws:ec2:us-east-1:123456789123:instance/i-2',
        'arn:aws:ec2:us-east-1:123456789123:instance/i-3',
      ]),
    );

    expect(recommendations.map((result) => result.arn)).toEqual(arns);
    expect(
      new Set(recommendations.map((result) => result.recommendation.type)),
    ).toEqual(new Set(['UpgradeEc2InstanceGeneration']));
  });

  test('should return an empty array when the provided instances have no recommendations', async () => {
    sendMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const arns = [
      'arn:aws:ec2:us-east-2:123456789123:instance/i-1',
      'arn:aws:ec2:us-east-1:123456789123:instance/i-2',
    ];

    const recommendations = await getEC2RecommendationsForARNs(
      CREDENTIALS,
      Finding.OVER_PROVISIONED,
      arns,
    );

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(recommendations.length).toBe(0);
  });

  test('should return an empty array when the given ec2 have 0 savings recommendations', async () => {
    const findingType = Finding.OPTIMIZED;
    const recommendationZeroSaving = createRecommendations(
      'arn:aws:ec2:us-east-2:123456789123:volume/vol-1',
      findingType,
    );
    const recommendationNoSavingObj = createRecommendations(
      'arn:aws:ec2:us-east-2:123456789123:volume/vol-2',
      findingType,
    );

    recommendationZeroSaving.recommendationOptions![0].savingsOpportunity!.estimatedMonthlySavings!.value = 0;
    recommendationNoSavingObj.recommendationOptions![0].savingsOpportunity =
      undefined;

    sendMock
      .mockResolvedValueOnce([
        createRecommendationsResponse([recommendationZeroSaving]),
      ])
      .mockResolvedValueOnce([
        createRecommendationsResponse([recommendationNoSavingObj]),
      ]);

    const arns = [
      'arn:aws:ec2:us-east-2:123456789123:instance/i-1',
      'arn:aws:ec2:us-east-1:123456789123:instance/i-2',
    ];

    const recommendations = await getEC2RecommendationsForARNs(
      CREDENTIALS,
      Finding.OPTIMIZED,
      arns,
    );

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(recommendations.length).toBe(0);
  });
});

function createRecommendationsResponse(
  instanceRecommendations: InstanceRecommendation[],
  nextToken?: string,
): { instanceRecommendations: InstanceRecommendation[]; nextToken?: string } {
  return {
    instanceRecommendations: instanceRecommendations,
    nextToken: nextToken,
  };
}

function createRecommendations(
  arn: string,
  finding?: Finding,
): InstanceRecommendation {
  return {
    accountId: 'accountId',
    instanceName: 'instanceName',
    finding: finding || Finding.OPTIMIZED,
    instanceArn: arn,
    currentInstanceType: 't2.nano',
    recommendationOptions: [
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

function createEC2InstanceRecommendationsCommandForAssertion(
  findingType: Finding,
  instanceArns?: string[],
) {
  return expect.objectContaining({
    input: {
      instanceArns: instanceArns, // or undefined if you expect it not set
      filters: [{ name: 'Finding', values: [findingType] }],
    },
  });
}
