const describeSnapshotMock = jest.fn();
const deleteSnapshotMock = jest.fn();
const getAwsClientMock = {
  getAwsClient: jest.fn().mockImplementation(() => ({
    describeSnapshots: describeSnapshotMock,
    deleteSnapshot: deleteSnapshotMock,
  })),
};

jest.mock('../../../src/lib/aws/get-client', () => getAwsClientMock);

const waitForMock = {
  waitForConditionWithTimeout: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../../src/lib/condition-watcher', () => waitForMock);

import * as EC2 from '@aws-sdk/client-ec2';
import { SnapshotState } from '@aws-sdk/client-ec2';
import { deleteEbsSnapshot } from '../../../src/lib/aws/ebs/delete-ebs-snapshot';

const credentials = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some defaultRegion',
};

describe('deleteSnapshot tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should delete snapshot as expected', async () => {
    waitForMock.waitForConditionWithTimeout.mockImplementation((func) =>
      func(),
    );
    deleteSnapshotMock.mockImplementation(
      (params: EC2.DeleteSnapshotRequest) => {
        return Promise.resolve({
          metadata: {
            httpStatusCode: 200,
            requestId: 'aaf45396-fbf1-4e42-8a9d-6e633b6bcd80',
            attempts: 1,
            totalRetryDelay: 0,
          },
        });
      },
    );
    const customError = new Error(
      "The snapshot 'snap-06ddd0fce9b40dbe4' does not exist.",
    ) as Error & { name: string };
    customError.name = 'InvalidSnapshot.NotFound';
    describeSnapshotMock.mockRejectedValue(customError);

    const result = await deleteEbsSnapshot(
      credentials,
      'region1',
      'volumeId1',
      false,
      300,
    );

    expect(result).toEqual({
      snapshotId: 'volumeId1',
      message: 'Snapshot deleted',
    });
    expect(waitForMock.waitForConditionWithTimeout).toHaveBeenCalledTimes(1);
    expect(waitForMock.waitForConditionWithTimeout).toHaveBeenCalledWith(
      expect.any(Function),
      300,
      2000,
      `Snapshot deletion timed out`,
    );
    expect(deleteSnapshotMock).toHaveBeenCalledTimes(1);
    expect(deleteSnapshotMock).toHaveBeenCalledWith({
      SnapshotId: 'volumeId1',
      DryRun: false,
    });
    expect(describeSnapshotMock).toHaveBeenCalledTimes(1);
    expect(describeSnapshotMock).toHaveBeenCalledWith({
      SnapshotIds: ['volumeId1'],
      DryRun: false,
    });
    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
  });

  test('should throw if wait for timeout throws', async () => {
    waitForMock.waitForConditionWithTimeout.mockRejectedValue(
      new Error('Snapshot deletion timed out'),
    );
    deleteSnapshotMock.mockImplementation(
      (params: EC2.DeleteSnapshotRequest) => {
        return Promise.resolve({
          metadata: {
            httpStatusCode: 200,
            requestId: 'aaf45396-fbf1-4e42-8a9d-6e633b6bcd80',
            attempts: 1,
            totalRetryDelay: 0,
          },
        });
      },
    );
    describeSnapshotMock.mockImplementation(
      (params: EC2.DescribeSnapshotsRequest) => {
        return Promise.resolve({
          Snapshots: [
            {
              SnapshotId: params.SnapshotIds![0],
              State: SnapshotState.completed,
            },
          ],
        });
      },
    );

    await expect(
      deleteEbsSnapshot(credentials, 'region1', 'volumeId1', false, 10),
    ).rejects.toThrow('Snapshot deletion timed out');
    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
  });

  test('should throw when describe Snapshot returns with error state', async () => {
    waitForMock.waitForConditionWithTimeout.mockImplementation((func: any) => {
      return func();
    });
    deleteSnapshotMock.mockResolvedValue({
      metadata: {
        httpStatusCode: 200,
        requestId: 'aaf45396-fbf1-4e42-8a9d-6e633b6bcd80',
        attempts: 1,
        totalRetryDelay: 0,
      },
    });
    describeSnapshotMock.mockResolvedValue({
      Snapshots: [
        {
          SnapshotId: 'volumeId1',
          State: SnapshotState.error,
          StateMessage: 'Snapshot deletion failed',
        },
      ],
    });

    await expect(
      deleteEbsSnapshot(credentials, 'region1', 'volumeId1', true, 10),
    ).rejects.toThrow(
      'Snapshot deletion failed with error: Snapshot deletion failed',
    );
    expect(describeSnapshotMock).toHaveBeenCalledTimes(1);
    expect(describeSnapshotMock).toHaveBeenCalledWith({
      SnapshotIds: ['volumeId1'],
      DryRun: true,
    });
    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
  });

  test('should not wait for if no number is provided', async () => {
    deleteSnapshotMock.mockResolvedValue({
      metadata: {
        httpStatusCode: 200,
        requestId: 'aaf45396-fbf1-4e42-8a9d-6e633b6bcd80',
        attempts: 1,
        totalRetryDelay: 0,
      },
    });
    describeSnapshotMock.mockResolvedValue({
      Snapshots: [
        {
          SnapshotId: 'volumeId1',
          State: SnapshotState.error,
          StateMessage: 'Snapshot deletion failed',
        },
      ],
    });

    const result = (await deleteEbsSnapshot(
      credentials,
      'region1',
      'volumeId1',
      false,
    )) as any;
    expect(result).toStrictEqual({
      message: 'Snapshot deletion being processed',
      snapshotId: 'volumeId1',
    });
    expect(describeSnapshotMock).not.toHaveBeenCalled();
    expect(waitForMock.waitForConditionWithTimeout).not.toHaveBeenCalled();
    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
  });
});
