const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  getCredentialsListFromAuth: jest.fn(),
  getEbsVolumes: jest.fn(),
  getEbsVolumesAllowPartial: jest.fn(),
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

import { VolumeType } from '@aws-sdk/client-ec2';
import { ebsGetVolumesAction } from '../../src/lib/actions/ebs/ebs-get-volumes-action';

describe('ebsGetVolumes action tests', () => {
  const dummyEbsVolumes = [
    {
      arn: 'some arn1',
      account_id: 'some account1',
      region: 'some region1',
      volume_id: 'some vol1',
      volume_type: VolumeType.gp2,
      size: 100,
    },
    {
      arn: 'some arn2',
      account_id: 'some account2',
      region: 'some region2',
      volume_id: 'some vol2',
      volume_type: VolumeType.gp2,
      size: 100,
    },
  ];

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

  it('should create action with correct properties', () => {
    expect(Object.keys(ebsGetVolumesAction.props).length).toBe(9);
    expect(ebsGetVolumesAction.props).toMatchObject({
      shouldQueryOnlyUnattached: {
        required: false,
        type: 'CHECKBOX',
        displayName: 'Get Only Unattached',
      },
      volumeTypes: {
        required: false,
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
        displayName: 'Volume Types',
      },
      dryRun: {
        required: false,
        defaultValue: false,
        type: 'CHECKBOX',
      },
      accounts: {
        required: true,
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
      },
      tags: {
        type: 'ARRAY',
      },
      condition: {
        type: 'STATIC_DROPDOWN',
      },
      filterByARNs: {
        type: 'CHECKBOX',
      },
      filterProperty: {
        type: 'DYNAMIC',
      },
      allowPartialResults: {
        required: false,
        defaultValue: false,
        type: 'CHECKBOX',
      },
    });
  });

  test('should use the correct credentials', async () => {
    openopsCommonMock.getEbsVolumes.mockResolvedValue(dummyEbsVolumes);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['region1'] },
        dryRun: false,
        accounts: {},
      },
    };

    const result = await ebsGetVolumesAction.run(context);

    expect(result).toStrictEqual(dummyEbsVolumes);
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      undefined,
    );
  });

  test('should call getEbsVolumes without filters when there are no filters set', async () => {
    openopsCommonMock.getEbsVolumes.mockResolvedValue(dummyEbsVolumes);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        shouldQueryOnlyUnattached: false,
        volumeTypes: [],
        filterProperty: { regions: ['region1', 'region2'] },
        dryRun: false,
        accounts: {},
      },
    };

    const result = await ebsGetVolumesAction.run(context);

    expect(result).toStrictEqual(dummyEbsVolumes);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenCalledWith(
      'credentials',
      ['region1', 'region2'],
      false,
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

  test('should call getEbsVolumes with the correct filters when shouldQueryOnlyUnattached is true', async () => {
    openopsCommonMock.getEbsVolumes.mockResolvedValue(dummyEbsVolumes);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        shouldQueryOnlyUnattached: true,
        volumeTypes: [],
        filterProperty: { regions: ['region1', 'region2'] },
        dryRun: false,
        accounts: {},
      },
    };

    const result = await ebsGetVolumesAction.run(context);

    expect(result).toStrictEqual(dummyEbsVolumes);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenCalledWith(
      'credentials',
      ['region1', 'region2'],
      false,
      [{ Name: 'status', Values: ['available'] }],
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      undefined,
    );
  });

  test('should call getEbsVolumes with the correct filters when volume types are set', async () => {
    openopsCommonMock.getEbsVolumes.mockResolvedValue(dummyEbsVolumes);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        shouldQueryOnlyUnattached: false,
        volumeTypes: ['gp2', 'io1'],
        filterProperty: { regions: ['region1', 'region2'] },
        dryRun: false,
        accounts: {},
      },
    };

    const result = await ebsGetVolumesAction.run(context);

    expect(result).toStrictEqual(dummyEbsVolumes);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenCalledWith(
      'credentials',
      ['region1', 'region2'],
      false,
      [{ Name: 'volume-type', Values: ['gp2', 'io1'] }],
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      undefined,
    );
  });

  test('should call getEbsVolumes with the correct filters when shouldQueryOnlyUnattached is true and volume types are set', async () => {
    openopsCommonMock.getEbsVolumes.mockResolvedValue(dummyEbsVolumes);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        shouldQueryOnlyUnattached: true,
        volumeTypes: ['gp2', 'io1'],
        filterProperty: { regions: ['region1', 'region2'] },
        dryRun: false,
        accounts: {},
      },
    };

    const result = await ebsGetVolumesAction.run(context);

    expect(result).toStrictEqual(dummyEbsVolumes);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenCalledWith(
      'credentials',
      ['region1', 'region2'],
      false,
      [
        { Name: 'status', Values: ['available'] },
        { Name: 'volume-type', Values: ['gp2', 'io1'] },
      ],
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      undefined,
    );
  });

  test('should try to filter by tags if set', async () => {
    openopsCommonMock.filterTags
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    openopsCommonMock.getEbsVolumes.mockResolvedValue([
      { Name: 'resource1', Tags: ['tag1'] },
      { Name: 'resource2', Tags: ['tag2'] },
      { Name: 'resource3', Tags: ['tag3'] },
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

    const result = (await ebsGetVolumesAction.run(context)) as any;

    expect(result).toStrictEqual([
      { Name: 'resource1', Tags: ['tag1'] },
      { Name: 'resource3', Tags: ['tag3'] },
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

  test('should throw an error if getEbsVolumes fails', async () => {
    openopsCommonMock.getEbsVolumes.mockRejectedValue('some error');

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['region1'] },
        dryRun: false,
        accounts: {},
      },
    };

    await expect(ebsGetVolumesAction.run(context)).rejects.toThrow(
      'An error occurred while fetching EBS volumes: some error',
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.getCredentialsListFromAuth).toHaveBeenCalledWith(
      auth,
      undefined,
    );
  });

  test('should call getCredentialsListFromAuth with accounts', async () => {
    openopsCommonMock.getEbsVolumes.mockResolvedValue(dummyEbsVolumes);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['region1'] },
        dryRun: false,
        accounts: { accounts: ['1', '2'] },
      },
    };

    await ebsGetVolumesAction.run(context);

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
    openopsCommonMock.getEbsVolumes.mockResolvedValueOnce(dummyEbsVolumes);
    openopsCommonMock.getEbsVolumes.mockResolvedValueOnce(dummyEbsVolumes);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterProperty: { regions: ['region1'] },
        dryRun: false,
        accounts: {},
      },
    };

    const result = await ebsGetVolumesAction.run(context);

    expect(result).toStrictEqual([...dummyEbsVolumes, ...dummyEbsVolumes]);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenCalledTimes(2);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenNthCalledWith(
      1,
      'credentials1',
      ['region1'],
      false,
      [],
    );
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenNthCalledWith(
      2,
      'credentials2',
      ['region1'],
      false,
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
        filterProperty: { arns: ['arn:aws:ec2:region1:1:v-123'] },
        accounts: {},
        dryRun: false,
      },
    };

    openopsCommonMock.getEbsVolumes.mockResolvedValue(['volume1']);

    const result = (await ebsGetVolumesAction.run(context)) as any;

    expect(result).toEqual(['volume1']);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenCalledWith(
      'credentials1',
      ['region1'],
      false,
      [{ Name: 'volume-id', Values: ['v-123'] }],
    );
  });

  test('should call once per region', async () => {
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'credentials1',
    ]);
    openopsCommonMock.getEbsVolumes
      .mockResolvedValueOnce(['volume1'])
      .mockResolvedValueOnce(['volume2']);
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        filterByARNs: true,
        filterProperty: {
          arns: [
            'arn:aws:ec2:region1:1:v-1',
            'arn:aws:ec2:region2:1:v-2',
            'arn:aws:ec2:region1:1:v-3',
            'arn:aws:ec2:region2:1:v-4',
          ],
        },
        accounts: {},
        dryRun: false,
      },
    };

    const result = (await ebsGetVolumesAction.run(context)) as any;

    expect(result).toEqual(['volume1', 'volume2']);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenCalledTimes(2);
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenNthCalledWith(
      1,
      'credentials1',
      ['region1'],
      false,
      [{ Name: 'volume-id', Values: ['v-1', 'v-3'] }],
    );
    expect(openopsCommonMock.getEbsVolumes).toHaveBeenNthCalledWith(
      2,
      'credentials1',
      ['region2'],
      false,
      [{ Name: 'volume-id', Values: ['v-2', 'v-4'] }],
    );
  });

  test('when allowPartialResults, uses partial helper and returns object shape', async () => {
    openopsCommonMock.getEbsVolumesAllowPartial.mockResolvedValue({
      results: [{ volume_id: 'vol-1' }],
      failedRegions: [
        { region: 'eu-west-1', accountId: '111', error: 'Error: denied' },
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

    const result = (await ebsGetVolumesAction.run(context)) as any;

    expect(result).toEqual({
      results: [{ volume_id: 'vol-1' }],
      failedRegions: [
        { region: 'eu-west-1', accountId: '111', error: 'Error: denied' },
      ],
    });
    expect(openopsCommonMock.getEbsVolumesAllowPartial).toHaveBeenCalledWith(
      'credentials',
      ['us-east-1', 'eu-west-1'],
      false,
      [],
    );
    expect(openopsCommonMock.getEbsVolumes).not.toHaveBeenCalled();
  });

  test('when allowPartialResults, aggregates multiple credentials', async () => {
    openopsCommonMock.getCredentialsListFromAuth.mockResolvedValue([
      'cred-a',
      'cred-b',
    ]);
    openopsCommonMock.getEbsVolumesAllowPartial
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

    const result = (await ebsGetVolumesAction.run(context)) as any;

    expect(result.results).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(result.failedRegions).toEqual([
      { region: 'us-west-2', accountId: '2', error: 'e' },
    ]);
    expect(openopsCommonMock.getEbsVolumesAllowPartial).toHaveBeenCalledTimes(
      2,
    );
  });
});
