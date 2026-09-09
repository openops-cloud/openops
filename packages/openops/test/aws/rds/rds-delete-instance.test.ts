const deleteDBInstanceCommandMock = jest.fn();

jest.mock('@aws-sdk/client-rds', () => {
  return {
    ...jest.requireActual('@aws-sdk/client-rds'),
    DeleteDBInstanceCommand: deleteDBInstanceCommandMock,
  };
});

const sendMock = jest.fn();
const awsClientMock = {
  getAwsClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
};
jest.mock('../../../src/lib/aws/get-client', () => awsClientMock);

const waitForMock = {
  waitForConditionWithTimeout: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../../../src/lib/condition-watcher', () => waitForMock);

const describeRdsInstancesMock = {
  describeRdsInstances: jest.fn(),
};
jest.mock(
  '../../../src/lib/aws/rds/rds-describe',
  () => describeRdsInstancesMock,
);

import * as RDS from '@aws-sdk/client-rds';
import { initiateRdsInstanceDeletion } from '../../../src/lib/aws/rds/rds-delete-instance';

const credentials = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some defaultRegion',
};

describe('delete RDS instance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  deleteDBInstanceCommandMock.mockImplementation(() => {
    return { input: { DBInstanceIdentifier: 'some InstanceId' } };
  });

  sendMock.mockImplementation((params: RDS.DeleteDBInstanceCommand) => {
    return Promise.resolve({ InstanceId: params.input.DBInstanceIdentifier });
  });

  test.each([true, false])(
    'should delete rds instance',
    async (createLastSnapshot: boolean) => {
      const result = await initiateRdsInstanceDeletion(
        credentials,
        'some-region1',
        'some InstanceId',
        createLastSnapshot,
      );
      expect(result).toMatchObject({ InstanceId: 'some InstanceId' });

      expect(awsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
      expect(awsClientMock.getAwsClient).toHaveBeenCalledWith(
        RDS.RDS,
        credentials,
        'some-region1',
      );

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(deleteDBInstanceCommandMock).toHaveBeenCalledTimes(1);
      expect(deleteDBInstanceCommandMock).toHaveBeenCalledWith({
        DBInstanceIdentifier: 'some InstanceId',
        SkipFinalSnapshot: !createLastSnapshot,
      });
      expect(
        describeRdsInstancesMock.describeRdsInstances,
      ).not.toHaveBeenCalled();
    },
  );

  test(`should throw when send mock throws`, async () => {
    sendMock.mockRejectedValueOnce(new Error('some error'));

    await expect(
      initiateRdsInstanceDeletion(
        credentials,
        'some-region1',
        'some InstanceId',
        false,
      ),
    ).rejects.toThrow('Delete RDS Instance failed with error: some error');
  });

  test('should wait for if number is provided', async () => {
    waitForMock.waitForConditionWithTimeout.mockImplementationOnce((func) =>
      func(),
    );
    describeRdsInstancesMock.describeRdsInstances.mockResolvedValue([
      { InstanceId: 'InstanceId', Status: 'deleting' },
    ]);

    const result = await initiateRdsInstanceDeletion(
      credentials,
      'some-region1',
      'some InstanceId',
      false,
      300,
    );
    expect(result).toStrictEqual({ InstanceId: 'some InstanceId' });
    expect(waitForMock.waitForConditionWithTimeout).toHaveBeenCalledTimes(1);
    expect(waitForMock.waitForConditionWithTimeout).toHaveBeenCalledWith(
      expect.any(Function),
      300,
      2000,
      `Instance deletion timed out`,
    );
    expect(awsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
    expect(describeRdsInstancesMock.describeRdsInstances).toHaveBeenCalledTimes(
      1,
    );
  });

  test('should not wait for if no number is provided', async () => {
    const result = await initiateRdsInstanceDeletion(
      credentials,
      'some-region1',
      'some InstanceId',
      false,
    );

    expect(result).toStrictEqual({ InstanceId: 'some InstanceId' });
    expect(
      describeRdsInstancesMock.describeRdsInstances,
    ).not.toHaveBeenCalled();
    expect(waitForMock.waitForConditionWithTimeout).not.toHaveBeenCalled();
  });
});
