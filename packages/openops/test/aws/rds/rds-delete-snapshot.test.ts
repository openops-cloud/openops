const deleteDBSnapshotCommandMock = jest.fn();

jest.mock('@aws-sdk/client-rds', () => {
  return {
    ...jest.requireActual('@aws-sdk/client-rds'),
    DeleteDBSnapshotCommand: deleteDBSnapshotCommandMock,
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

const describeRdsSnapshotsMock = {
  describeRdsSnapshots: jest.fn(),
};
jest.mock(
  '../../../src/lib/aws/rds/rds-describe',
  () => describeRdsSnapshotsMock,
);

import * as RDS from '@aws-sdk/client-rds';
import { initiateRdsSnapshotDeletion } from '../../../src/lib/aws/rds/rds-delete-snapshot';

const credentials = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some defaultRegion',
};

describe('deleteSnapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  deleteDBSnapshotCommandMock.mockImplementation(() => {
    return { input: { DBSnapshotIdentifier: 'some snapshotId' } };
  });

  sendMock.mockImplementation((params: RDS.DeleteDBSnapshotCommand) => {
    return Promise.resolve({ SnapshotId: params.input.DBSnapshotIdentifier });
  });

  test('should delete rds snapshot', async () => {
    const result = await initiateRdsSnapshotDeletion(
      credentials,
      'some-region1',
      'some snapshotId',
    );

    expect(awsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
    expect(awsClientMock.getAwsClient).toHaveBeenCalledWith(
      RDS.RDS,
      credentials,
      'some-region1',
    );
    expect(result).toMatchObject({ SnapshotId: 'some snapshotId' });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  test(`should throw when send mock throws`, async () => {
    sendMock.mockRejectedValueOnce(new Error('some error'));

    await expect(
      initiateRdsSnapshotDeletion(
        credentials,
        'some-region1',
        'some snapshotId',
      ),
    ).rejects.toThrow('Delete RDS Snapshot failed with error: some error');

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(deleteDBSnapshotCommandMock).toHaveBeenCalledWith({
      DBSnapshotIdentifier: 'some snapshotId',
    });
  });

  test('should wait for if number is provided', async () => {
    waitForMock.waitForConditionWithTimeout.mockImplementationOnce((func) =>
      func(),
    );
    describeRdsSnapshotsMock.describeRdsSnapshots.mockResolvedValue([
      { SnapshotId: 'snapshotId', Status: 'deleting' },
    ]);

    const result = await initiateRdsSnapshotDeletion(
      credentials,
      'some-region1',
      'some snapshotId',
      300,
    );
    expect(result).toStrictEqual({ SnapshotId: 'some snapshotId' });
    expect(waitForMock.waitForConditionWithTimeout).toHaveBeenCalledTimes(1);
    expect(waitForMock.waitForConditionWithTimeout).toHaveBeenCalledWith(
      expect.any(Function),
      300,
      2000,
      `Snapshot deletion timed out`,
    );
    expect(awsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
    expect(describeRdsSnapshotsMock.describeRdsSnapshots).toHaveBeenCalledTimes(
      1,
    );
  });

  test('should not wait for if no number is provided', async () => {
    const result = await initiateRdsSnapshotDeletion(
      credentials,
      'some-region1',
      'some snapshotId',
    );

    expect(result).toStrictEqual({ SnapshotId: 'some snapshotId' });
    expect(
      describeRdsSnapshotsMock.describeRdsSnapshots,
    ).not.toHaveBeenCalled();
    expect(waitForMock.waitForConditionWithTimeout).not.toHaveBeenCalled();
  });
});
