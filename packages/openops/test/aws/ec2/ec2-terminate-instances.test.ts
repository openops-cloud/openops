const terminateInstancesMock = jest.fn();
const getAwsClientMock = {
  getAwsClient: jest.fn().mockImplementation(() => ({
    terminateInstances: terminateInstancesMock,
  })),
};

jest.mock('../../../src/lib/aws/get-client', () => getAwsClientMock);

import * as EC2 from '@aws-sdk/client-ec2';
import { initiateEc2InstanceTermination } from '../../../src/lib/aws/ec2/ec2-terminate-instances';

const credentials = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some defaultRegion',
};

describe('deleteInstances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initiate ec2 instance termination', async () => {
    terminateInstancesMock.mockResolvedValue({
      TerminatingInstances: [{ CurrentState: { Name: 'shutting-down' } }],
    });

    const result = await initiateEc2InstanceTermination(
      credentials,
      'some-region1',
      ['some instanceId'],
      false,
    );

    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledWith(
      EC2.EC2,
      credentials,
      'some-region1',
    );
    expect(result).toMatchObject({
      TerminatingInstances: [{ CurrentState: { Name: 'shutting-down' } }],
    });
    expect(terminateInstancesMock).toHaveBeenCalledTimes(1);
    expect(terminateInstancesMock).toHaveBeenCalledWith({
      InstanceIds: ['some instanceId'],
      DryRun: false,
    });
  });

  test(`should throw when terminateInstancesMock throws`, async () => {
    terminateInstancesMock.mockRejectedValue(new Error('some error'));

    await expect(
      initiateEc2InstanceTermination(
        credentials,
        'some-region1',
        ['some instanceId'],
        true,
      ),
    ).rejects.toThrow('some error');
    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledWith(
      EC2.EC2,
      credentials,
      'some-region1',
    );
    expect(terminateInstancesMock).toHaveBeenCalledTimes(1);
    expect(terminateInstancesMock).toHaveBeenCalledWith({
      InstanceIds: ['some instanceId'],
      DryRun: true,
    });
  });
});
