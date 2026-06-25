const describeInstancesCommandMock = jest.fn();
jest.mock('@aws-sdk/client-ec2', () => {
  return {
    ...jest.requireActual('@aws-sdk/client-ec2'),
    DescribeInstancesCommand: describeInstancesCommandMock,
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
import {
  getEc2Instances,
  getEc2InstancesAllowPartial,
} from '../../../src/lib/aws/ec2/ec2-get-instances';

describe('getEc2Instances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create ec2 with regions %p', async () => {
    const sendMock = jest
      .fn()
      .mockResolvedValueOnce({
        Reservations: [
          {
            Instances: [
              { InstanceId: `mockResult1`, InstanceType: 'c1.medium' },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        Reservations: [
          {
            Instances: [
              { InstanceId: `mockResult2`, InstanceType: 'c1.medium' },
            ],
          },
        ],
      });

    getAwsClientMock.getAwsClient.mockImplementation(() => ({
      send: sendMock,
    }));

    const filters = [{ Name: 'some filter', Values: ['some value'] }];
    const result = await getEc2Instances(
      CREDENTIALS,
      ['some-region1', 'some-region2'],
      false,
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
        instance_id: 'mockResult1',
        region: 'some-region1',
        account_id: ACCOUNT_ID,
        account_name: ACCOUNT_NAME,
        arn: 'arn:aws:ec2:some-region1:SomeAccountId:instance/mockResult1',
        instance_type: EC2._InstanceType.c1_medium,
      },
      {
        instance_id: 'mockResult2',
        region: 'some-region2',
        account_id: ACCOUNT_ID,
        account_name: ACCOUNT_NAME,
        arn: 'arn:aws:ec2:some-region2:SomeAccountId:instance/mockResult2',
        instance_type: EC2._InstanceType.c1_medium,
      },
    ]);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(describeInstancesCommandMock).toHaveBeenCalledWith({
      Filters: filters,
      DryRun: false,
    });
  });

  test('Should add display name if exists %p', async () => {
    const sendMock = jest.fn().mockResolvedValue({
      Reservations: [
        {
          Instances: [
            { InstanceId: 'mockResult1', InstanceType: 'c1.medium' },
            {
              InstanceId: 'mockResult2',
              InstanceType: 'c1.medium',
              Tags: [{ Key: 'Name', Value: 'SomeName' }],
            },
            {
              InstanceId: 'mockResult3',
              InstanceType: 'c1.medium',
              Tags: [{ Key: 'FalseKeyName', Value: 'SomeName' }],
            },
          ],
        },
      ],
    });

    getAwsClientMock.getAwsClient.mockImplementation(() => ({
      send: sendMock,
    }));
    const filters = [{ Name: 'some filter', Values: ['some value'] }];
    const result = await getEc2Instances(
      CREDENTIALS,
      ['some-region1'],
      true,
      filters,
    );

    const expectedResult = [
      {
        displayName: undefined,
        instance_id: 'mockResult1',
        region: 'some-region1',
        account_id: ACCOUNT_ID,
        account_name: ACCOUNT_NAME,
        arn: 'arn:aws:ec2:some-region1:SomeAccountId:instance/mockResult1',
        instance_type: EC2._InstanceType.c1_medium,
      },
      {
        displayName: 'SomeName',
        instance_id: 'mockResult2',
        region: 'some-region1',
        account_id: ACCOUNT_ID,
        account_name: ACCOUNT_NAME,
        arn: 'arn:aws:ec2:some-region1:SomeAccountId:instance/mockResult2',
        instance_type: EC2._InstanceType.c1_medium,
      },
      {
        displayName: undefined,
        instance_id: 'mockResult3',
        region: 'some-region1',
        account_id: ACCOUNT_ID,
        account_name: ACCOUNT_NAME,
        arn: 'arn:aws:ec2:some-region1:SomeAccountId:instance/mockResult3',
        instance_type: EC2._InstanceType.c1_medium,
      },
    ];
    expect(result).toMatchObject(expectedResult);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(describeInstancesCommandMock).toHaveBeenCalledWith({
      Filters: filters,
      DryRun: true,
    });
  });
});

describe('getEc2InstancesAllowPartial', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns instances from successful regions and skips failed regions', async () => {
    const sendMock = jest
      .fn()
      .mockResolvedValueOnce({
        Reservations: [
          {
            Instances: [
              { InstanceId: 'ok-instance', InstanceType: 'c1.medium' },
            ],
          },
        ],
      })
      .mockRejectedValueOnce(new Error('UnauthorizedOperation'));

    getAwsClientMock.getAwsClient.mockImplementation(() => ({
      send: sendMock,
    }));

    const result = await getEc2InstancesAllowPartial(
      CREDENTIALS,
      ['some-region1', 'some-region2'],
      false,
      [],
    );

    expect(result.results).toMatchObject([
      {
        instance_id: 'ok-instance',
        region: 'some-region1',
        account_id: ACCOUNT_ID,
      },
    ]);
    expect(result.failedRegions).toEqual([
      {
        region: 'some-region2',
        accountId: ACCOUNT_ID,
        error: 'Error: UnauthorizedOperation',
      },
    ]);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});
