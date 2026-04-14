const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  getCredentialsListFromAuth: jest.fn(),
  getEc2Instances: jest.fn(),
  getEc2InstancesAllowPartial: jest.fn(),
  dryRunCheckBox: jest.fn().mockReturnValue({
    required: false,
    defaultValue: false,
    type: 'CHECKBOX',
  }),
  getAwsAccountsMultiSelectDropdown: jest.fn().mockReturnValue({
    accounts: {
      required: true,
      defaultValue: false,
      type: 'STATIC_MULTI_SELECT_DROPDOWN',
    },
  }),
  filterTagsProperties: jest.fn().mockReturnValue({
    tags: {
      type: 'ARRAY',
    },
    condition: {
      type: 'STATIC_DROPDOWN',
    },
  }),
  filterTags: jest.fn(),
  filterByArnsOrRegionsProperties: jest.fn().mockReturnValue({
    filterByARNs: {
      type: 'CHECKBOX',
    },
    filterProperty: {
      type: 'DYNAMIC',
    },
  }),
};

jest.mock('@openops/common', () => openopsCommonMock);
import { ec2GetInstancesAction } from '../../src/lib/actions/ec2/ec2-get-instances-action';

describe('ec2GetInstancesAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'credentials',
    ]);
  });

  const auth = {
    accessKeyId: 'some accessKeyId',
    secretAccessKey: 'some secretAccessKey',
    defaultRegion: 'some defaultRegion',
  };

  test('should create action with input regions property', () => {
    expect(Object.keys(ec2GetInstancesAction.props).length).toBe(9);
    expect(ec2GetInstancesAction.props).toMatchObject({
      accounts: {
        required: true,
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
      },
      instanceTypes: {
        required: false,
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
        displayName: 'Instance Types',
      },
      instanceStates: {
        required: false,
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
        displayName: 'Instance States',
      },
      tags: {
        type: 'ARRAY',
      },
      condition: {
        type: 'STATIC_DROPDOWN',
      },
      dryRun: {
        required: false,
        defaultValue: false,
        type: 'CHECKBOX',
      },
      allowPartialResults: {
        required: false,
        defaultValue: false,
        type: 'CHECKBOX',
      },
      filterByARNs: {
        type: 'CHECKBOX',
      },
      filterProperty: {
        type: 'DYNAMIC',
      },
    });
  });

  test('should use the correct credentials', async () => {
    openopsCommonMock.getEc2Instances.mockResolvedValue(['mockResult']);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['some-region1'] },
        dryRun: false,
        accounts: {},
      },
    };

    const result = (await ec2GetInstancesAction.run(context)) as any;

    expect(result).toEqual(['mockResult']);
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      undefined,
    );
  });

  test.each([
    [[]],
    [['some-region1']],
    [['some-region1', 'some-region2']],
    [['some-region1', 'some-region2', 'some-region3']],
  ])(
    'should call getEc2Instances without filters when there are no filters set',
    async (regions: any) => {
      const context = {
        ...jest.requireActual('@openops/blocks-framework'),
        auth: auth,
        propsValue: {
          filterProperty: { regions: regions },
          dryRun: false,
          accounts: {},
        },
      };

      openopsCommonMock.getEc2Instances.mockResolvedValue(['mockResult']);

      const result = (await ec2GetInstancesAction.run(context)) as any;

      expect(result).toEqual(['mockResult']);
      expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledWith(
        'credentials',
        regions,
        false,
        [],
      );
      expect(
        openopsCommonMock.getCredentialsListFromAuth,
      ).toHaveBeenCalledTimes(1);
      expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
        auth,
        undefined,
      );
    },
  );

  it('should throw error when getEc2Instances throws error', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['some-region1'] },
        dryRun: true,
        accounts: {},
      },
    };

    openopsCommonMock.getEc2Instances.mockRejectedValue(['mockError']);

    await expect(ec2GetInstancesAction.run(context)).rejects.toThrow(
      'An error occurred while fetching EC2 Instances: mockError',
    );
    expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledWith(
      'credentials',
      ['some-region1'],
      true,
      [],
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      undefined,
    );
  });

  test('should call with accounts', async () => {
    openopsCommonMock.getEc2Instances.mockResolvedValue(['mockResult']);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['some-region1'] },
        dryRun: true,
        accounts: { accounts: ['1', '2'] },
      },
    };

    (await ec2GetInstancesAction.run(context)) as any;

    expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledWith(
      'credentials',
      ['some-region1'],
      true,
      [],
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      ['1', '2'],
    );
  });

  test('should flatten result', async () => {
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
      'credentials2',
    ]);
    openopsCommonMock.getEc2Instances.mockResolvedValueOnce(['mockResult']);
    openopsCommonMock.getEc2Instances.mockResolvedValueOnce([
      'mockResult1',
      'mockResult2',
    ]);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['some-region1'] },
        dryRun: true,
        accounts: {},
      },
    };

    const result = (await ec2GetInstancesAction.run(context)) as any;

    expect(result).toStrictEqual(['mockResult', 'mockResult1', 'mockResult2']);
    expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledTimes(2);
    expect(openopsCommonMock.getEc2Instances).toHaveBeenNthCalledWith(
      1,
      'credentials1',
      ['some-region1'],
      true,
      [],
    );
    expect(openopsCommonMock.getEc2Instances).toHaveBeenNthCalledWith(
      2,
      'credentials2',
      ['some-region1'],
      true,
      [],
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      undefined,
    );
  });

  test.each([
    ['t2_nano', ['t2_nano']],
    [['t2_nano'], ['t2_nano']],
    [
      ['t2_nano', 't3_micro'],
      ['t2_nano', 't3_micro'],
    ],
  ])(
    'should call getEc2Instances with the correct filters when instance types are set',
    async (instanceTypes, expectedFilterValue) => {
      const context = {
        ...jest.requireActual('@openops/blocks-framework'),
        auth: auth,
        propsValue: {
          filterProperty: { regions: ['some-region1'] },
          dryRun: true,
          accounts: { accounts: ['1', '2'] },
          instanceTypes,
        },
      };

      openopsCommonMock.getEc2Instances.mockResolvedValue(['mockResult']);

      (await ec2GetInstancesAction.run(context)) as any;

      expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledTimes(1);
      expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledWith(
        'credentials',
        ['some-region1'],
        true,
        [{ Name: 'instance-type', Values: expectedFilterValue }],
      );
      expect(
        openopsCommonMock.getCredentialsListFromAuth,
      ).toHaveBeenCalledTimes(1);
      expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
        auth,
        ['1', '2'],
      );
    },
  );

  test('should call getEc2Instances with the correct filters when instance types and instance states are set', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['some-region1'] },
        dryRun: true,
        accounts: { accounts: ['1', '2'] },
        instanceTypes: ['t2_nano', 't3_micro'],
        instanceStates: ['running', 'stopped'],
      },
    };

    openopsCommonMock.getEc2Instances.mockResolvedValue(['mockResult']);

    (await ec2GetInstancesAction.run(context)) as any;

    expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledWith(
      'credentials',
      ['some-region1'],
      true,
      [
        { Name: 'instance-type', Values: ['t2_nano', 't3_micro'] },
        { Name: 'instance-state-name', Values: ['running', 'stopped'] },
      ],
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      ['1', '2'],
    );
  });

  test.each([
    ['running', ['running']],
    [['running'], ['running']],
    [
      ['running', 'stopped'],
      ['running', 'stopped'],
    ],
  ])(
    'should call getEc2Instances with the correct filters when instance states are set',
    async (instanceStates, expectedFilterValue) => {
      const context = {
        ...jest.requireActual('@openops/blocks-framework'),
        auth: auth,
        propsValue: {
          filterProperty: { regions: ['some-region1'] },
          dryRun: true,
          accounts: { accounts: ['1', '2'] },
          instanceStates: instanceStates,
        },
      };

      openopsCommonMock.getEc2Instances.mockResolvedValue(['mockResult']);

      (await ec2GetInstancesAction.run(context)) as any;

      expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledTimes(1);
      expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledWith(
        'credentials',
        ['some-region1'],
        true,
        [{ Name: 'instance-state-name', Values: expectedFilterValue }],
      );
      expect(
        openopsCommonMock.getCredentialsListFromAuth,
      ).toHaveBeenCalledTimes(1);
      expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
        auth,
        ['1', '2'],
      );
    },
  );

  test('should try to filter by tags if set', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['some-region1'] },
        dryRun: true,
        accounts: { accounts: ['1', '2'] },
        tags: [{ name: 'some name', pattern: 'some pattern' }],
        condition: 'AND',
      },
    };

    openopsCommonMock.filterTags
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    openopsCommonMock.getEc2Instances.mockResolvedValue([
      { Name: 'resource1', Tags: ['tag1'] },
      { Name: 'resource2', Tags: ['tag2'] },
      { Name: 'resource3', Tags: ['tag3'] },
    ]);
    (await ec2GetInstancesAction.run(context)) as any;

    expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledWith(
      'credentials',
      ['some-region1'],
      true,
      [],
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      ['1', '2'],
    );
    expect(openopsCommonMock.filterTags).toHaveBeenCalledTimes(3);
    expect(openopsCommonMock.filterTags).toHaveBeenNthCalledWith(
      1,
      ['tag1'],
      [{ name: 'some name', pattern: 'some pattern' }],
      'AND',
    );
    expect(openopsCommonMock.filterTags).toHaveBeenNthCalledWith(
      2,
      ['tag2'],
      [{ name: 'some name', pattern: 'some pattern' }],
      'AND',
    );
    expect(openopsCommonMock.filterTags).toHaveBeenNthCalledWith(
      3,
      ['tag3'],
      [{ name: 'some name', pattern: 'some pattern' }],
      'AND',
    );
  });

  test('should work with arns', async () => {
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
    ]);
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: true,
        dryRun: false,
        filterProperty: { arns: ['arn:aws:ec2:region1:1:i-123'] },
        accounts: {},
      },
    };

    openopsCommonMock.getEc2Instances.mockResolvedValue(['instance1']);

    const result = (await ec2GetInstancesAction.run(context)) as any;

    expect(result).toEqual(['instance1']);
    expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledWith(
      'credentials1',
      ['region1'],
      false,
      [{ Name: 'instance-id', Values: ['i-123'] }],
    );
  });

  test('should call once per region', async () => {
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
    ]);
    openopsCommonMock.getEc2Instances
      .mockResolvedValueOnce(['instance1'])
      .mockResolvedValueOnce(['instance2']);
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: true,
        filterProperty: {
          arns: [
            'arn:aws:ec2:region1:1:i-1',
            'arn:aws:ec2:region2:1:i-2',
            'arn:aws:ec2:region1:1:i-3',
            'arn:aws:ec2:region2:1:i-4',
          ],
        },
        accounts: {},
        dryRun: false,
      },
    };

    const result = (await ec2GetInstancesAction.run(context)) as any;

    expect(result).toEqual(['instance1', 'instance2']);
    expect(openopsCommonMock.getEc2Instances).toHaveBeenCalledTimes(2);
    expect(openopsCommonMock.getEc2Instances).toHaveBeenNthCalledWith(
      1,
      'credentials1',
      ['region1'],
      false,
      [{ Name: 'instance-id', Values: ['i-1', 'i-3'] }],
    );
    expect(openopsCommonMock.getEc2Instances).toHaveBeenNthCalledWith(
      2,
      'credentials1',
      ['region2'],
      false,
      [{ Name: 'instance-id', Values: ['i-2', 'i-4'] }],
    );
  });

  test('when allowPartialResults, uses partial helper and returns object shape', async () => {
    openopsCommonMock.getEc2InstancesAllowPartial.mockResolvedValue({
      results: [{ instance_id: 'i-1' }],
      failedRegions: [
        { region: 'eu-west-1', accountId: '111', error: 'AccessDenied' },
      ],
    });

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['us-east-1', 'eu-west-1'] },
        dryRun: false,
        accounts: {},
        allowPartialResults: true,
      },
    };

    const result = (await ec2GetInstancesAction.run(context)) as any;

    expect(result).toEqual({
      results: [{ instance_id: 'i-1' }],
      failedRegions: [
        { region: 'eu-west-1', accountId: '111', error: 'AccessDenied' },
      ],
    });
    expect(openopsCommonMock.getEc2InstancesAllowPartial).toHaveBeenCalledWith(
      'credentials',
      ['us-east-1', 'eu-west-1'],
      false,
      [],
    );
    expect(openopsCommonMock.getEc2Instances).not.toHaveBeenCalled();
  });

  test('when allowPartialResults, aggregates multiple credentials', async () => {
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'cred-a',
      'cred-b',
    ]);
    openopsCommonMock.getEc2InstancesAllowPartial
      .mockResolvedValueOnce({
        results: [{ id: 'a' }],
        failedRegions: [],
      })
      .mockResolvedValueOnce({
        results: [{ id: 'b' }],
        failedRegions: [{ region: 'us-west-2', accountId: '2', error: 'e' }],
      });

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['us-east-1'] },
        dryRun: true,
        accounts: {},
        allowPartialResults: true,
      },
    };

    const result = (await ec2GetInstancesAction.run(context)) as any;

    expect(result.results).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(result.failedRegions).toEqual([
      { region: 'us-west-2', accountId: '2', error: 'e' },
    ]);
    expect(openopsCommonMock.getEc2InstancesAllowPartial).toHaveBeenCalledTimes(
      2,
    );
  });
});
