const openopsCommon = {
  ...jest.requireActual('@openops/common'),
  isEbsVolume: () => true,
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
  getEbsRecommendationsForARNs: jest.fn(),
  getEbsRecommendationsForRegions: jest.fn(),
  getEbsRecommendationsForARNsAllowPartial: jest.fn(),
  getEbsRecommendationsForRegionsAllowPartial: jest.fn(),
};

jest.mock(
  '../src/lib/common/compute-optimizer-ebs-client',
  () => computeOptimizerMock,
);

import { ebsGetRecommendationsAction } from '../src/lib/actions/ebs-get-recommendations-action';

describe('ebsGetRecommendationsAction', () => {
  const auth = {
    accessKeyId: 'some accessKeyId',
    secretAccessKey: 'some secretAccessKey',
    defaultRegion: 'some defaultRegion',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    openopsCommon.getCredentialsListFromAuth.mockResolvedValue(['credentials']);
  });

  test('should create action with correct properties', () => {
    expect(ebsGetRecommendationsAction.props).toMatchObject({
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

  test('should use the correct credentials with accounts', async () => {
    computeOptimizerMock.getEbsRecommendationsForRegions.mockResolvedValue([
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

    const result = (await ebsGetRecommendationsAction.run(context)) as any;
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

    computeOptimizerMock.getEbsRecommendationsForRegions.mockRejectedValue(
      'mockError',
    );

    await expect(ebsGetRecommendationsAction.run(context)).rejects.toThrow(
      'An error occurred while requesting Ebs Volumes recommendations: mockError',
    );
    expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledTimes(1);
    expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      undefined,
    );
  });

  test.each([
    ['arn:aws:iam::1:ebs/volume-id'],
    [['arn:aws:iam::1:ebs/volume-id']],
  ])(
    'should call getEbsRecommendationsForVolumes when filterProperty has volumes',
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

      computeOptimizerMock.getEbsRecommendationsForARNs.mockResolvedValue([
        'mockResult',
      ]);

      const result = (await ebsGetRecommendationsAction.run(context)) as any;

      expect(result).toEqual(['mockResult']);
      expect(
        computeOptimizerMock.getEbsRecommendationsForRegions,
      ).toHaveBeenCalledTimes(0);
      expect(
        computeOptimizerMock.getEbsRecommendationsForARNs,
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

    computeOptimizerMock.getEbsRecommendationsForARNs.mockResolvedValue([
      'mockResult',
    ]);

    const result = (await ebsGetRecommendationsAction.run(context)) as any;

    expect(result).toEqual(['mockResult', 'mockResult', 'mockResult']);
    expect(
      computeOptimizerMock.getEbsRecommendationsForRegions,
    ).toHaveBeenCalledTimes(0);
    expect(
      computeOptimizerMock.getEbsRecommendationsForARNs,
    ).toHaveBeenCalledTimes(3);
    expect(
      computeOptimizerMock.getEbsRecommendationsForARNs,
    ).toHaveBeenNthCalledWith(1, 'credentials1', 'Optimized', [
      'arn:aws:iam::1:instance/instance-id',
      'arn:aws:iam::1:instance/instance-id3',
    ]);
    expect(
      computeOptimizerMock.getEbsRecommendationsForARNs,
    ).toHaveBeenNthCalledWith(2, 'credentials2', 'Optimized', [
      'arn:aws:iam::2:instance/instance-id2',
    ]);
    expect(
      computeOptimizerMock.getEbsRecommendationsForARNs,
    ).toHaveBeenNthCalledWith(3, 'credentials3', 'Optimized', [
      'arn:aws:iam::3:instance/instance-id4',
      'arn:aws:iam::3:instance/instance-id5',
    ]);
    expect(openopsCommon.getCredentialsForAccount).toHaveBeenCalledTimes(3);
  });

  test.each([[[]], [['region1']], [['region1', 'region2']]])(
    'should call getEbsRecommendationsForRegions when filterProperty has regions',
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

      computeOptimizerMock.getEbsRecommendationsForRegions.mockResolvedValue([
        'mockResult',
      ]);

      const result = (await ebsGetRecommendationsAction.run(context)) as any;

      expect(result).toEqual(['mockResult']);
      expect(
        computeOptimizerMock.getEbsRecommendationsForRegions,
      ).toHaveBeenCalledTimes(1);
      expect(
        computeOptimizerMock.getEbsRecommendationsForARNs,
      ).toHaveBeenCalledTimes(0);
      expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledTimes(1);
      expect(openopsCommon.getCredentialsForAccount).not.toHaveBeenCalled();
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
    computeOptimizerMock.getEbsRecommendationsForRegions
      .mockResolvedValueOnce(['mockResult1'])
      .mockResolvedValueOnce(['mockResult2', 'mockReuslt3']);

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

    const result = (await ebsGetRecommendationsAction.run(context)) as any;

    expect(result).toEqual(['mockResult1', 'mockResult2', 'mockReuslt3']);
    expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledTimes(1);
    expect(openopsCommon.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      ['1', '2'],
    );
    expect(
      computeOptimizerMock.getEbsRecommendationsForRegions,
    ).toHaveBeenCalledTimes(2);
    expect(
      computeOptimizerMock.getEbsRecommendationsForRegions,
    ).toHaveBeenNthCalledWith(1, 'credentials1', 'Optimized', ['us-east-2']);
    expect(
      computeOptimizerMock.getEbsRecommendationsForRegions,
    ).toHaveBeenNthCalledWith(2, 'credentials2', 'Optimized', ['us-east-2']);
  });

  test('when allowPartialResults with regions, uses partial helper and returns object shape', async () => {
    openopsCommon.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
      'credentials2',
    ]);
    computeOptimizerMock.getEbsRecommendationsForRegionsAllowPartial
      .mockResolvedValueOnce({
        results: [{ arn: 'vol-1' }],
        failedRegions: [{ region: 'eu-west-1', accountId: '9', error: 'x' }],
      })
      .mockResolvedValueOnce({
        results: [{ arn: 'vol-2' }],
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

    const result = (await ebsGetRecommendationsAction.run(context)) as any;

    expect(result).toEqual({
      results: [{ arn: 'vol-1' }, { arn: 'vol-2' }],
      failedRegions: [{ region: 'eu-west-1', accountId: '9', error: 'x' }],
    });
    expect(
      computeOptimizerMock.getEbsRecommendationsForRegionsAllowPartial,
    ).toHaveBeenCalledTimes(2);
    expect(
      computeOptimizerMock.getEbsRecommendationsForRegions,
    ).not.toHaveBeenCalled();
  });
});
