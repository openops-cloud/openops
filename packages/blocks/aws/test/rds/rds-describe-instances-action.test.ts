const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  getCredentialsListFromAuth: jest.fn(),
  describeRdsInstances: jest.fn(),
  describeRdsInstancesAllowPartial: jest.fn(),
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

import { rdsGetInstancesAction } from '../../src/lib/actions/rds/rds-describe-instances-action';

const auth = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some defaultRegion',
};

describe('rdsGetInstancesAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
    ]);
  });

  test('should create action with correct properties', () => {
    expect(Object.keys(rdsGetInstancesAction.props).length).toBe(8);
    expect(rdsGetInstancesAction.props).toMatchObject({
      accounts: {
        required: true,
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
      },
      filterByARNs: {
        type: 'CHECKBOX',
      },
      filterProperty: {
        type: 'DYNAMIC',
      },
      clusterIds: {
        type: 'ARRAY',
        required: false,
      },
      domainIds: {
        type: 'ARRAY',
        required: false,
      },
      tags: {
        type: 'ARRAY',
      },
      condition: {
        type: 'STATIC_DROPDOWN',
      },
      allowPartialResults: {
        required: false,
        defaultValue: false,
        type: 'CHECKBOX',
      },
    });
  });

  test('should use the correct credentials', async () => {
    openopsCommonMock.describeRdsInstances.mockResolvedValue([
      'instance1',
      'instance2',
    ]);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: false,
        filterProperty: { regions: ['region1'] },
        accounts: {},
      },
    };

    const result = await rdsGetInstancesAction.run(context);

    expect(result).toStrictEqual(['instance1', 'instance2']);
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      undefined,
    );
  });

  test('should call getCredentialsListFromAuth with accounts', async () => {
    openopsCommonMock.describeRdsInstances.mockResolvedValue(['instance1']);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: false,
        filterProperty: { regions: ['region1'] },
        accounts: { accounts: ['1', '2'] },
      },
    };

    await rdsGetInstancesAction.run(context);

    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      ['1', '2'],
    );
  });

  test('should throw an error when describeRdsInstances throws error', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: false,
        filterProperty: { regions: ['region1'] },
        accounts: {},
      },
    };
    openopsCommonMock.describeRdsInstances.mockRejectedValue(
      new Error('mockError'),
    );

    await expect(rdsGetInstancesAction.run(context)).rejects.toThrow(
      'mockError',
    );

    expect(openopsCommonMock.describeRdsInstances).toHaveBeenCalledTimes(1);
  });

  test('should call describeRdsInstances with given input', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: false,
        filterProperty: { regions: ['region1'] },
        accounts: {},
        clusterIds: ['cluster1'],
        resourceIds: ['resource1'],
        domainIds: ['domain1'],
      },
    };

    openopsCommonMock.describeRdsInstances.mockResolvedValue(['instance1']);

    const result = (await rdsGetInstancesAction.run(context)) as any;

    expect(result).toEqual(['instance1']);
    expect(openopsCommonMock.describeRdsInstances).toHaveBeenCalledWith(
      'credentials1',
      ['region1'],
      [
        { Name: 'db-cluster-id', Values: ['cluster1'] },
        { Name: 'domain', Values: ['domain1'] },
        { Name: 'dbi-resource-id', Values: ['resource1'] },
      ],
    );

    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      context.auth,
      undefined,
    );
  });

  test('should try to filter by tags if set', async () => {
    openopsCommonMock.filterTags
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    openopsCommonMock.describeRdsInstances.mockResolvedValue([
      { Name: 'resource1', TagList: ['tag1'] },
      { Name: 'resource2', TagList: ['tag2'] },
      { Name: 'resource3', TagList: ['tag3'] },
    ]);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['region1'] },
        accounts: {},
        tags: [{ name: 'some name', pattern: 'some pattern' }],
        condition: 'AND',
      },
    };

    const result = (await rdsGetInstancesAction.run(context)) as any;

    expect(result).toStrictEqual([
      { Name: 'resource1', TagList: ['tag1'] },
      { Name: 'resource3', TagList: ['tag3'] },
    ]);
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
        filterProperty: { arns: ['arn:aws:rds:region1:1:i-123'] },
        accounts: {},
      },
    };

    openopsCommonMock.describeRdsInstances.mockResolvedValue(['instance1']);

    const result = (await rdsGetInstancesAction.run(context)) as any;

    expect(result).toEqual(['instance1']);
    expect(openopsCommonMock.describeRdsInstances).toHaveBeenCalledWith(
      'credentials1',
      ['region1'],
      [{ Name: 'db-instance-id', Values: ['i-123'] }],
    );
  });

  test('should call once per region', async () => {
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
    ]);
    openopsCommonMock.describeRdsInstances
      .mockResolvedValueOnce(['instance1'])
      .mockResolvedValueOnce(['instance2']);
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: true,
        filterProperty: {
          arns: [
            'arn:aws:rds:region1:1:i-1',
            'arn:aws:rds:region2:1:i-2',
            'arn:aws:rds:region1:1:i-3',
            'arn:aws:rds:region2:1:i-4',
          ],
        },
        accounts: {},
      },
    };

    const result = (await rdsGetInstancesAction.run(context)) as any;

    expect(result).toEqual(['instance1', 'instance2']);
    expect(openopsCommonMock.describeRdsInstances).toHaveBeenCalledTimes(2);
    expect(openopsCommonMock.describeRdsInstances).toHaveBeenNthCalledWith(
      1,
      'credentials1',
      ['region1'],
      [{ Name: 'db-instance-id', Values: ['i-1', 'i-3'] }],
    );
    expect(openopsCommonMock.describeRdsInstances).toHaveBeenNthCalledWith(
      2,
      'credentials1',
      ['region2'],
      [{ Name: 'db-instance-id', Values: ['i-2', 'i-4'] }],
    );
  });

  test('should flatten result', async () => {
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
      'credentials2',
    ]);
    openopsCommonMock.describeRdsInstances.mockResolvedValueOnce([
      'instance1',
      'instance2',
    ]);
    openopsCommonMock.describeRdsInstances.mockResolvedValueOnce([
      'instance3',
      'instance4',
    ]);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['region1'] },
        dryRun: false,
        accounts: {},
      },
    };

    const result = await rdsGetInstancesAction.run(context);

    expect(result).toStrictEqual([
      'instance1',
      'instance2',
      'instance3',
      'instance4',
    ]);
    expect(openopsCommonMock.describeRdsInstances).toHaveBeenCalledTimes(2);
    expect(openopsCommonMock.describeRdsInstances).toHaveBeenNthCalledWith(
      1,
      'credentials1',
      ['region1'],
      [],
    );
    expect(openopsCommonMock.describeRdsInstances).toHaveBeenNthCalledWith(
      2,
      'credentials2',
      ['region1'],
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

  test('when allowPartialResults, uses partial helper and returns object shape', async () => {
    openopsCommonMock.describeRdsInstancesAllowPartial.mockResolvedValue({
      results: [{ DBInstanceIdentifier: 'db-1' }],
      failedRegions: [
        { region: 'eu-west-1', accountId: '111', error: 'Error: denied' },
      ],
    });

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: false,
        filterProperty: { regions: ['us-east-1', 'eu-west-1'] },
        accounts: {},
        allowPartialResults: true,
      },
    };

    const result = (await rdsGetInstancesAction.run(context)) as any;

    expect(result).toEqual({
      results: [{ DBInstanceIdentifier: 'db-1' }],
      failedRegions: [
        { region: 'eu-west-1', accountId: '111', error: 'Error: denied' },
      ],
    });
    expect(
      openopsCommonMock.describeRdsInstancesAllowPartial,
    ).toHaveBeenCalledWith('credentials1', ['us-east-1', 'eu-west-1'], []);
    expect(openopsCommonMock.describeRdsInstances).not.toHaveBeenCalled();
  });

  test('when allowPartialResults, aggregates multiple credentials', async () => {
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'cred-a',
      'cred-b',
    ]);
    openopsCommonMock.describeRdsInstancesAllowPartial
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
        filterByARNs: false,
        filterProperty: { regions: ['us-east-1'] },
        accounts: {},
        allowPartialResults: true,
      },
    };

    const result = (await rdsGetInstancesAction.run(context)) as any;

    expect(result.results).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(result.failedRegions).toEqual([
      { region: 'us-west-2', accountId: '2', error: 'e' },
    ]);
    expect(
      openopsCommonMock.describeRdsInstancesAllowPartial,
    ).toHaveBeenCalledTimes(2);
  });
});
