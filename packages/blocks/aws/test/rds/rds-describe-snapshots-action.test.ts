const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  getCredentialsListFromAuth: jest.fn(),
  describeRdsSnapshots: jest.fn(),
  describeRdsSnapshotsAllowPartial: jest.fn(),
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
      type: 'CHECK_BOX',
    },
    filterProperty: {
      type: 'DYNAMIC',
    },
  }),
};

jest.mock('@openops/common', () => openopsCommonMock);

import { rdsGetSnapshotsAction } from '../../src/lib/actions/rds/rds-describe-snapshots-action';

const auth = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some defaultRegion',
};

describe('rdsGetSnapshotsAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
    ]);
  });

  test('should create action with correct properties', () => {
    expect(Object.keys(rdsGetSnapshotsAction.props).length).toBe(10);
    expect(rdsGetSnapshotsAction.props).toMatchObject({
      accounts: {
        required: true,
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
      },
      filterByARNs: {
        type: 'CHECK_BOX',
      },
      filterProperty: {
        type: 'DYNAMIC',
      },
      instanceIds: {
        type: 'ARRAY',
        required: false,
      },
      snapshotType: {
        type: 'ARRAY',
        required: false,
      },
      minimumCreationDate: {
        type: 'DATE_TIME',
        required: false,
      },
      maximumCreationDate: {
        type: 'DATE_TIME',
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
    openopsCommonMock.describeRdsSnapshots.mockResolvedValue([
      'snapshot1',
      'snapshot2',
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

    const result = await rdsGetSnapshotsAction.run(context);

    expect(result).toStrictEqual(['snapshot1', 'snapshot2']);
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      undefined,
    );
  });

  test('should call getCredentialsListFromAuth with accounts', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: false,
        filterProperty: { regions: ['region1'] },
        accounts: { accounts: ['1', '2'] },
      },
    };

    await rdsGetSnapshotsAction.run(context);

    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      ['1', '2'],
    );
  });

  test('should throw an error when describeRdsSnapshots throws error', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: false,
        filterProperty: { regions: ['region1'] },
        accounts: {},
      },
    };
    openopsCommonMock.describeRdsSnapshots.mockRejectedValue(
      new Error('mockError'),
    );

    await expect(rdsGetSnapshotsAction.run(context)).rejects.toThrow(
      'mockError',
    );

    expect(openopsCommonMock.describeRdsSnapshots).toHaveBeenCalledTimes(1);
  });

  test('should call describeRdsSnapshots with given input', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: false,
        filterProperty: { regions: ['region1'] },
        accounts: {},
        instanceIds: ['instance1'],
        snapshotType: ['snapshotType1'],
        resourceIds: ['resourceId1'],
      },
    };

    openopsCommonMock.describeRdsSnapshots.mockResolvedValue(['snapshot1']);

    const result = (await rdsGetSnapshotsAction.run(context)) as any;

    expect(result).toEqual(['snapshot1']);
    expect(openopsCommonMock.describeRdsSnapshots).toHaveBeenCalledWith(
      'credentials1',
      ['region1'],
      [
        { Name: 'snapshot-type', Values: ['snapshotType1'] },
        { Name: 'db-instance-id', Values: ['instance1'] },
        { Name: 'dbi-resource-id', Values: ['resourceId1'] },
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
    openopsCommonMock.describeRdsSnapshots.mockResolvedValue([
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

    const result = (await rdsGetSnapshotsAction.run(context)) as any;

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

  test('should flatten result', async () => {
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
      'credentials2',
    ]);
    openopsCommonMock.describeRdsSnapshots.mockResolvedValueOnce([
      'snapshot1',
      'snapshot2',
    ]);
    openopsCommonMock.describeRdsSnapshots.mockResolvedValueOnce([
      'snapshot3',
      'snapshot4',
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

    const result = await rdsGetSnapshotsAction.run(context);

    expect(result).toStrictEqual([
      'snapshot1',
      'snapshot2',
      'snapshot3',
      'snapshot4',
    ]);
    expect(openopsCommonMock.describeRdsSnapshots).toHaveBeenCalledTimes(2);
    expect(openopsCommonMock.describeRdsSnapshots).toHaveBeenNthCalledWith(
      1,
      'credentials1',
      ['region1'],
      [],
    );
    expect(openopsCommonMock.describeRdsSnapshots).toHaveBeenNthCalledWith(
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

  test('should work with arns', async () => {
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
    ]);
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: true,
        filterProperty: { arns: ['arn:aws:rds:region1:1:snap-123'] },
        accounts: {},
      },
    };

    openopsCommonMock.describeRdsSnapshots.mockResolvedValue(['snapshot1']);

    const result = (await rdsGetSnapshotsAction.run(context)) as any;

    expect(result).toEqual(['snapshot1']);
    expect(openopsCommonMock.describeRdsSnapshots).toHaveBeenCalledWith(
      'credentials1',
      ['region1'],
      [{ Name: 'db-snapshot-id', Values: ['snap-123'] }],
    );
  });

  test('should call once per region', async () => {
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
    ]);
    openopsCommonMock.describeRdsSnapshots
      .mockResolvedValueOnce(['snapshot1'])
      .mockResolvedValueOnce(['snapshot2']);
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: true,
        filterProperty: {
          arns: [
            'arn:aws:rds:region1:1:snap-1',
            'arn:aws:rds:region2:1:snap-2',
            'arn:aws:rds:region1:1:snap-3',
            'arn:aws:rds:region2:1:snap-4',
          ],
        },
        accounts: {},
      },
    };

    const result = (await rdsGetSnapshotsAction.run(context)) as any;

    expect(result).toEqual(['snapshot1', 'snapshot2']);
    expect(openopsCommonMock.describeRdsSnapshots).toHaveBeenCalledTimes(2);
    expect(openopsCommonMock.describeRdsSnapshots).toHaveBeenNthCalledWith(
      1,
      'credentials1',
      ['region1'],
      [{ Name: 'db-snapshot-id', Values: ['snap-1', 'snap-3'] }],
    );
    expect(openopsCommonMock.describeRdsSnapshots).toHaveBeenNthCalledWith(
      2,
      'credentials1',
      ['region2'],
      [{ Name: 'db-snapshot-id', Values: ['snap-2', 'snap-4'] }],
    );
  });

  test('should filter by date if minimum or maximum date are set', async () => {
    openopsCommonMock.describeRdsSnapshots.mockResolvedValue([
      { Name: 'snapshot1', SnapshotCreateTime: '2020-02-02T00:00:00Z' },
      { Name: 'snapshot2', SnapshotCreateTime: '2019-01-01T00:00:00Z' },
      { Name: 'snapshot3', SnapshotCreateTime: '2024-01-01T00:00:00Z' },
    ]);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['region1'] },
        accounts: {},
        minimumCreationDate: '2020-01-01T00:00:00Z',
        maximumCreationDate: '2021-01-01T00:00:00Z',
      },
    };

    const result = (await rdsGetSnapshotsAction.run(context)) as any;

    expect(result).toStrictEqual([
      { Name: 'snapshot1', SnapshotCreateTime: '2020-02-02T00:00:00Z' },
    ]);
  });

  test('when allowPartialResults, uses partial helper and returns object shape', async () => {
    openopsCommonMock.describeRdsSnapshotsAllowPartial.mockResolvedValue({
      results: [{ DBSnapshotIdentifier: 'snap-1' }],
      failedRegions: [
        { region: 'eu-west-1', accountId: '1', error: 'Error: x' },
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

    const result = (await rdsGetSnapshotsAction.run(context)) as any;

    expect(result).toEqual({
      results: [{ DBSnapshotIdentifier: 'snap-1' }],
      failedRegions: [
        { region: 'eu-west-1', accountId: '1', error: 'Error: x' },
      ],
    });
    expect(
      openopsCommonMock.describeRdsSnapshotsAllowPartial,
    ).toHaveBeenCalledWith('credentials1', ['us-east-1', 'eu-west-1'], []);
    expect(openopsCommonMock.describeRdsSnapshots).not.toHaveBeenCalled();
  });

  test('when allowPartialResults, date filters apply only to results', async () => {
    openopsCommonMock.describeRdsSnapshotsAllowPartial.mockResolvedValue({
      results: [
        { Name: 's1', SnapshotCreateTime: '2020-02-02T00:00:00Z' },
        { Name: 's2', SnapshotCreateTime: '2019-01-01T00:00:00Z' },
      ],
      failedRegions: [],
    });

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: false,
        filterProperty: { regions: ['region1'] },
        accounts: {},
        allowPartialResults: true,
        minimumCreationDate: '2020-01-01T00:00:00Z',
        maximumCreationDate: '2021-01-01T00:00:00Z',
      },
    };

    const result = (await rdsGetSnapshotsAction.run(context)) as any;

    expect(result.results).toStrictEqual([
      { Name: 's1', SnapshotCreateTime: '2020-02-02T00:00:00Z' },
    ]);
    expect(result.failedRegions).toEqual([]);
  });
});
