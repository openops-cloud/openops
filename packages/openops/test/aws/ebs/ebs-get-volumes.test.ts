const debugMock = jest.fn();

jest.mock('@openops/server-shared', () => {
  return {
    logger: {
      debug: debugMock,
    },
  };
});

const describeVolumesCommandMock = jest.fn();
jest.mock('@aws-sdk/client-ec2', () => {
  return {
    ...jest.requireActual('@aws-sdk/client-ec2'),
    DescribeVolumesCommand: describeVolumesCommandMock,
  };
});

const CREDENTIALS = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  sessionToken: 'some sessionToken',
};
const ACCOUNT_ID = 'SomeAccountId';
const ACCOUNT_NAME = 'SomeAccountName';

jest.mock('../../../src/lib/aws/sts-common', () => {
  return { getAccountId: jest.fn().mockResolvedValue(ACCOUNT_ID) };
});
jest.mock('../../../src/lib/aws/organizations-common', () => {
  return { getAccountName: jest.fn().mockResolvedValue(ACCOUNT_NAME) };
});

const getAwsClientMock = {
  getAwsClient: jest.fn(),
};

jest.mock('../../../src/lib/aws/get-client', () => getAwsClientMock);
import * as EC2 from '@aws-sdk/client-ec2';
import { getEbsVolumes } from '../../../src/lib/aws/ebs/get-ebs-volumes';

describe('getEbsVolumes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return correct results for regions %p', async () => {
    const sendMock = jest
      .fn()
      .mockResolvedValueOnce({
        Volumes: [{ VolumeId: `mockResult1`, VolumeType: 'gp2', Size: 100 }],
      })
      .mockResolvedValueOnce({
        Volumes: [{ VolumeId: `mockResult2`, VolumeType: 'gp2', Size: 100 }],
      });

    getAwsClientMock.getAwsClient.mockImplementation(() => ({
      send: sendMock,
    }));

    const filters = [{ Name: 'some filter', Values: ['some value'] }];
    const result = await getEbsVolumes(
      CREDENTIALS,
      ['some-region1', 'some-region2'],
      true,
      filters,
    );

    expect(getAwsClientMock.getAwsClient).toBeCalledTimes(2);
    expect(getAwsClientMock.getAwsClient).toBeCalledWith(
      EC2.EC2,
      CREDENTIALS,
      'some-region1',
    );
    expect(getAwsClientMock.getAwsClient).toBeCalledWith(
      EC2.EC2,
      CREDENTIALS,
      'some-region2',
    );
    expect(result).toMatchObject([
      {
        volume_id: 'mockResult1',
        region: 'some-region1',
        account_id: ACCOUNT_ID,
        account_name: ACCOUNT_NAME,
        arn: 'arn:aws:ec2:some-region1:SomeAccountId:volume/mockResult1',
        volume_type: EC2.VolumeType.gp2,
        size: 100,
      },
      {
        volume_id: 'mockResult2',
        region: 'some-region2',
        account_id: ACCOUNT_ID,
        account_name: ACCOUNT_NAME,
        arn: 'arn:aws:ec2:some-region2:SomeAccountId:volume/mockResult2',
        volume_type: EC2.VolumeType.gp2,
        size: 100,
      },
    ]);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(describeVolumesCommandMock).toHaveBeenCalledWith({
      Filters: filters,
      DryRun: true,
    });
  });

  test('Should add display name if exists %p', async () => {
    const sendMock = jest.fn().mockResolvedValue({
      Volumes: [
        { VolumeId: `mockResult1`, VolumeType: 'gp2', Size: 100 },
        {
          VolumeId: `mockResult2`,
          VolumeType: 'gp2',
          Size: 100,
          Tags: [{ Key: 'Name', Value: 'SomeName' }],
        },
        {
          VolumeId: `mockResult3`,
          VolumeType: 'gp2',
          Size: 100,
          Tags: [{ Key: 'FalseKeyName', Value: 'SomeName' }],
        },
      ],
    });
    getAwsClientMock.getAwsClient.mockImplementation(() => ({
      send: sendMock,
    }));

    const filters: EC2.Filter[] = [
      { Name: 'some filter', Values: ['some value'] },
    ];

    const result = await getEbsVolumes(
      CREDENTIALS,
      ['some-region1'],
      false,
      filters,
    );

    expect(getAwsClientMock.getAwsClient).toBeCalledTimes(1);
    expect(getAwsClientMock.getAwsClient).toBeCalledWith(
      EC2.EC2,
      CREDENTIALS,
      'some-region1',
    );
    expect(result).toMatchObject([
      {
        displayName: undefined,
        volume_id: 'mockResult1',
        region: 'some-region1',
        account_id: ACCOUNT_ID,
        account_name: ACCOUNT_NAME,
        arn: 'arn:aws:ec2:some-region1:SomeAccountId:volume/mockResult1',
        volume_type: EC2.VolumeType.gp2,
        size: 100,
      },
      {
        displayName: 'SomeName',
        volume_id: 'mockResult2',
        region: 'some-region1',
        account_id: ACCOUNT_ID,
        account_name: ACCOUNT_NAME,
        arn: 'arn:aws:ec2:some-region1:SomeAccountId:volume/mockResult2',
        volume_type: EC2.VolumeType.gp2,
        size: 100,
      },
      {
        displayName: undefined,
        volume_id: 'mockResult3',
        region: 'some-region1',
        account_id: ACCOUNT_ID,
        account_name: ACCOUNT_NAME,
        arn: 'arn:aws:ec2:some-region1:SomeAccountId:volume/mockResult3',
        volume_type: EC2.VolumeType.gp2,
        size: 100,
      },
    ]);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(describeVolumesCommandMock).toHaveBeenCalledWith({
      Filters: filters,
      DryRun: false,
    });
  });

  test('should skip permission denied volume regions', async () => {
    const sendMock = jest
      .fn()
      .mockResolvedValueOnce({
        Volumes: [{ VolumeId: 'mockResult1', VolumeType: 'gp2', Size: 100 }],
      })
      .mockRejectedValueOnce(new Error('AccessDenied'));

    getAwsClientMock.getAwsClient.mockImplementation(() => ({
      send: sendMock,
    }));

    const result = await getEbsVolumes(
      CREDENTIALS,
      ['some-region1', 'some-region2'],
      false,
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0].volume_id).toBe('mockResult1');
    expect(result[0].region).toBe('some-region1');
    expect(debugMock).toHaveBeenCalledTimes(1);
  });

  test('should return empty array when all volume regions are denied', async () => {
    const sendMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('AccessDenied'))
      .mockRejectedValueOnce(new Error('UnauthorizedOperation'));

    getAwsClientMock.getAwsClient.mockImplementation(() => ({
      send: sendMock,
    }));

    const result = await getEbsVolumes(
      CREDENTIALS,
      ['some-region1', 'some-region2'],
      false,
      [],
    );

    expect(result).toEqual([]);
    expect(debugMock).toHaveBeenCalledTimes(2);
  });
});
