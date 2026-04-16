const openopsCommon = {
  ...jest.requireActual('@openops/common'),
  isEc2Instance: () => true,
  getAwsAccountsMultiSelectDropdown: jest.fn().mockReturnValue({
    accounts: {
      required: true,
      defaultValue: false,
      type: 'STATIC_MULTI_SELECT_DROPDOWN',
    },
  }),
  getCredentialsListFromAuth: jest.fn(),
  getCredentialsForAccount: jest.fn(),
};

jest.mock('@openops/common', () => openopsCommon);

const computeOptimizerMock = {
  getEC2RecommendationsForARNs: jest.fn(),
  getEC2RecommendationsForRegions: jest.fn(),
  getEC2RecommendationsForARNsAllowPartial: jest.fn(),
  getEC2RecommendationsForRegionsAllowPartial: jest.fn(),
};

jest.mock(
  '../src/lib/common/compute-optimizer-ec2-client',
  () => computeOptimizerMock,
);

import { ec2GetRecommendationsAction } from '../src/lib/actions/ec2-get-recommendations-action';

describe('ec2GetRecommendationsAction', () => {
  const auth = {
    accessKeyId: 'some accessKeyId',
    secretAccessKey: 'some secretAccessKey',
    defaultRegion: 'some defaultRegion',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    openopsCommon.getCredentialsListFromAuth.mockResolvedValue(['credentials']);
    openopsCommon.getCredentialsForAccount.mockResolvedValue(
      'credentials from account',
    );
  });

  test('should create action with correct properties', () => {
    expect(ec2GetRecommendationsAction.props).toMatchObject({
      recommendationType: {
        type: 'STATIC_DROPDOWN',
        required: true,
      },
      filterByARNs: {
        type: 'CHECKBOX',
        required: true,
      },
      filterProperty: {
        required: true,
        refreshers: ['filterByARNs'],
        type: 'DYNAMIC',
      },
      accounts: {
        required: true,
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
      },
      allowPartialResults: {
        type: 'CHECKBOX',
        required: false,
      },
    });
  });

  test('should use the correct credentials and accounts', async () => {
    computeOptimizerMock.getEC2RecommendationsForRegions.mockResolvedValue([
      'mockResult',
    ]);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        accounts: { accounts: ['1', '2'] },
        recommendationType: 'Optimized',
        filterProperty: {
          regions: ['us-east-2'],
        },
      },
    };

    const result = (await ec2GetRecommendationsAction.run(context)) as any;
    expect(result).toEqual(['mockResult']);

    expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledTimes(1);
    expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      ['1', '2'],
    );
  });

  test('should throw an error when ec2GetRecommendationsAction throws error', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        accounts: {},
        recommendationType: 'Optimized',
        filterProperty: {
          regions: ['us-east-2'],
        },
      },
    };

    computeOptimizerMock.getEC2RecommendationsForRegions.mockRejectedValue(
      'mockError',
    );

    await expect(ec2GetRecommendationsAction.run(context)).rejects.toThrow(
      'An error occurred while requesting EC2 recommendations: mockError',
    );
    expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledTimes(1);
    expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      undefined,
    );
  });
  test.each([
    ['arn:aws:iam::1:instance/instance-id'],
    [['arn:aws:iam::1:instance/instance-id']],
  ])(
    'should call getEC2RecommendationsForInstances when filterProperty has resources',
    async (arns: any) => {
      const context = {
        ...jest.requireActual('@openops/blocks-framework'),
        auth: auth,
        propsValue: {
          accounts: {},
          recommendationType: 'Optimized',
          filterProperty: {
            resourceARNs: arns,
          },
        },
      };

      computeOptimizerMock.getEC2RecommendationsForARNs.mockResolvedValue([
        'mockResult',
      ]);

      const result = (await ec2GetRecommendationsAction.run(context)) as any;

      expect(result).toEqual(['mockResult']);
      expect(
        computeOptimizerMock.getEC2RecommendationsForRegions,
      ).toHaveBeenCalledTimes(0);
      expect(
        computeOptimizerMock.getEC2RecommendationsForARNs,
      ).toHaveBeenCalledTimes(1);
      expect(openopsCommon.getCredentialsForAccount).toHaveBeenCalledTimes(1);
      expect(openopsCommon.getCredentialsForAccount).toHaveBeenCalledWith(
        auth,
        '1',
      );
      expect(openopsCommon.getCredentialsListFromAuth).not.toHaveBeenCalled();
    },
  );

  test('should call group by accounts when filterproperty has resources', async () => {
    openopsCommon.getCredentialsForAccount
      .mockResolvedValueOnce('credentials1')
      .mockResolvedValueOnce('credentials2')
      .mockResolvedValueOnce('credentials3');

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        accounts: {},
        recommendationType: 'Optimized',
        filterProperty: {
          resourceARNs: [
            'arn:aws:iam::1:instance/instance-id',
            'arn:aws:iam::2:instance/instance-id2',
            'arn:aws:iam::1:instance/instance-id3',
            'arn:aws:iam::3:instance/instance-id4',
            'arn:aws:iam::3:instance/instance-id5',
          ],
        },
      },
    };

    computeOptimizerMock.getEC2RecommendationsForARNs.mockResolvedValue([
      'mockResult',
    ]);

    const result = (await ec2GetRecommendationsAction.run(context)) as any;

    expect(result).toEqual(['mockResult', 'mockResult', 'mockResult']);
    expect(
      computeOptimizerMock.getEC2RecommendationsForRegions,
    ).toHaveBeenCalledTimes(0);
    expect(
      computeOptimizerMock.getEC2RecommendationsForARNs,
    ).toHaveBeenCalledTimes(3);
    expect(
      computeOptimizerMock.getEC2RecommendationsForARNs,
    ).toHaveBeenNthCalledWith(1, 'credentials1', 'Optimized', [
      'arn:aws:iam::1:instance/instance-id',
      'arn:aws:iam::1:instance/instance-id3',
    ]);
    expect(
      computeOptimizerMock.getEC2RecommendationsForARNs,
    ).toHaveBeenNthCalledWith(2, 'credentials2', 'Optimized', [
      'arn:aws:iam::2:instance/instance-id2',
    ]);
    expect(
      computeOptimizerMock.getEC2RecommendationsForARNs,
    ).toHaveBeenNthCalledWith(3, 'credentials3', 'Optimized', [
      'arn:aws:iam::3:instance/instance-id4',
      'arn:aws:iam::3:instance/instance-id5',
    ]);
    expect(openopsCommon.getCredentialsForAccount).toHaveBeenCalledTimes(3);
  });

  test.each([[[]], [['region1']], [['region1', 'region2']]])(
    'should call getEC2RecommendationsForRegions when filterProperty has regions',
    async (regions: any) => {
      const context = {
        ...jest.requireActual('@openops/blocks-framework'),
        auth: auth,
        propsValue: {
          accounts: {},
          recommendationType: 'Optimized',
          filterProperty: {
            regions,
          },
        },
      };

      computeOptimizerMock.getEC2RecommendationsForRegions.mockResolvedValue([
        'mockResult',
      ]);

      const result = (await ec2GetRecommendationsAction.run(context)) as any;

      expect(result).toEqual(['mockResult']);
      expect(
        computeOptimizerMock.getEC2RecommendationsForRegions,
      ).toHaveBeenCalledTimes(1);
      expect(
        computeOptimizerMock.getEC2RecommendationsForARNs,
      ).toHaveBeenCalledTimes(0);
      expect(openopsCommon.getCredentialsForAccount).not.toHaveBeenCalled();
      expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledTimes(1);
      expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledWith(
        auth,
        undefined,
      );
    },
  );

  test('should flatten the result', async () => {
    openopsCommon.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
      'credentials2',
    ]);
    computeOptimizerMock.getEC2RecommendationsForRegions
      .mockResolvedValueOnce(['mockResult1'])
      .mockResolvedValueOnce(['mockResult2', 'mockResult3']);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        accounts: { accounts: ['1', '2'] },
        recommendationType: 'Optimized',
        filterProperty: {
          regions: ['us-east-2'],
        },
      },
    };

    const result = (await ec2GetRecommendationsAction.run(context)) as any;
    expect(result).toEqual(['mockResult1', 'mockResult2', 'mockResult3']);
    expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledTimes(1);
    expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      ['1', '2'],
    );
    expect(
      computeOptimizerMock.getEC2RecommendationsForRegions,
    ).toHaveBeenCalledTimes(2);
    expect(
      computeOptimizerMock.getEC2RecommendationsForRegions,
    ).toHaveBeenNthCalledWith(1, 'credentials1', 'Optimized', ['us-east-2']);
    expect(
      computeOptimizerMock.getEC2RecommendationsForRegions,
    ).toHaveBeenNthCalledWith(2, 'credentials2', 'Optimized', ['us-east-2']);
  });

  test('when allowPartialResults with regions, uses partial helper and returns object shape', async () => {
    openopsCommon.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
      'credentials2',
    ]);
    computeOptimizerMock.getEC2RecommendationsForRegionsAllowPartial
      .mockResolvedValueOnce({
        results: [{ arn: 'a1' }],
        failedRegions: [{ region: 'us-east-1', accountId: '1', error: 'e1' }],
      })
      .mockResolvedValueOnce({
        results: [{ arn: 'a2' }],
        failedRegions: [],
      });

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        accounts: { accounts: ['1', '2'] },
        recommendationType: 'Optimized',
        allowPartialResults: true,
        filterProperty: {
          regions: ['us-east-2'],
        },
      },
    };

    const result = (await ec2GetRecommendationsAction.run(context)) as any;

    expect(result).toEqual({
      results: [{ arn: 'a1' }, { arn: 'a2' }],
      failedRegions: [{ region: 'us-east-1', accountId: '1', error: 'e1' }],
    });
    expect(
      computeOptimizerMock.getEC2RecommendationsForRegionsAllowPartial,
    ).toHaveBeenCalledTimes(2);
    expect(
      computeOptimizerMock.getEC2RecommendationsForRegionsAllowPartial,
    ).toHaveBeenNthCalledWith(1, 'credentials1', 'Optimized', ['us-east-2']);
    expect(
      computeOptimizerMock.getEC2RecommendationsForRegionsAllowPartial,
    ).toHaveBeenNthCalledWith(2, 'credentials2', 'Optimized', ['us-east-2']);
    expect(
      computeOptimizerMock.getEC2RecommendationsForRegions,
    ).not.toHaveBeenCalled();
  });

  test('when allowPartialResults with ARNs, uses partial helper and returns object shape', async () => {
    computeOptimizerMock.getEC2RecommendationsForARNsAllowPartial.mockResolvedValue(
      {
        results: [{ arn: 'arn:aws:ec2:us-east-2:1:instance/i-1' }],
        failedRegions: [],
      },
    );

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        accounts: {},
        recommendationType: 'Optimized',
        allowPartialResults: true,
        filterProperty: {
          resourceARNs: ['arn:aws:iam::1:instance/instance-id'],
        },
      },
    };

    const result = (await ec2GetRecommendationsAction.run(context)) as any;

    expect(result).toEqual({
      results: [{ arn: 'arn:aws:ec2:us-east-2:1:instance/i-1' }],
      failedRegions: [],
    });
    expect(
      computeOptimizerMock.getEC2RecommendationsForARNsAllowPartial,
    ).toHaveBeenCalledTimes(1);
    expect(
      computeOptimizerMock.getEC2RecommendationsForARNs,
    ).not.toHaveBeenCalled();
  });
});
