const describeSnapshotMock = jest.fn();
const createSnapshotMock = jest.fn();
const getAwsClientMock = {
  getAwsClient: jest.fn().mockImplementation(() => ({
    describeSnapshots: describeSnapshotMock,
    createSnapshot: createSnapshotMock,
  })),
};

jest.mock('../../../src/lib/aws/get-client', () => getAwsClientMock);

const waitForMock = {
  waitForConditionWithTimeout: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../../src/lib/condition-watcher', () => waitForMock);

import * as EC2 from '@aws-sdk/client-ec2';
import { SnapshotState } from '@aws-sdk/client-ec2';
import { createEbsSnapshot } from '../../../src/lib/aws/ebs/create-ebs-snapshot';

const credentials = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some defaultRegion',
};

describe('createSnapshot tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create snapshot as expected', async () => {
    waitForMock.waitForConditionWithTimeout.mockImplementation((func) =>
      func(),
    );
    createSnapshotMock.mockImplementation(
      (params: EC2.CreateSnapshotRequest) => {
        return Promise.resolve({ SnapshotId: params.VolumeId });
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

    const result = await createEbsSnapshot({
      credentials,
      region: 'region1',
      volumeId: 'volumeId1',
      description: 'some description',
      waitForInSeconds: 300,
      dryRun: false,
    });

    expect(result).toEqual({ SnapshotId: 'volumeId1', State: 'completed' });
    expect(waitForMock.waitForConditionWithTimeout).toHaveBeenCalledTimes(1);
    expect(waitForMock.waitForConditionWithTimeout).toHaveBeenCalledWith(
      expect.any(Function),
      300,
      2000,
      `Snapshot creation timed out`,
    );
    expect(createSnapshotMock).toHaveBeenCalledTimes(1);
    expect(createSnapshotMock).toHaveBeenCalledWith({
      VolumeId: 'volumeId1',
      Description: 'some description',
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
      new Error('Snapshot creation timed out'),
    );
    createSnapshotMock.mockImplementation(
      (params: EC2.CreateSnapshotRequest) => {
        return Promise.resolve({ SnapshotId: params.VolumeId });
      },
    );
    describeSnapshotMock.mockImplementation(
      (params: EC2.DescribeSnapshotsRequest) => {
        return Promise.resolve({
          Snapshots: [
            {
              SnapshotId: params.SnapshotIds![0],
              State: SnapshotState.pending,
            },
          ],
        });
      },
    );

    await expect(
      createEbsSnapshot({
        credentials,
        region: 'region1',
        volumeId: 'volumeId1',
        waitForInSeconds: 10,
        dryRun: false,
      }),
    ).rejects.toThrow('Snapshot creation timed out');
    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
  });

  test('should throw when snapshot creation status is error', async () => {
    createSnapshotMock.mockResolvedValue('mock Error');

    await expect(
      createEbsSnapshot({
        credentials,
        region: 'region1',
        volumeId: 'volumeId1',
        waitForInSeconds: 10,
        dryRun: false,
      }),
    ).rejects.toThrow('Snapshot creation failed with error: mock Error');
    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
    expect(waitForMock.waitForConditionWithTimeout).not.toHaveBeenCalled();
  });

  test('should throw when describe Snapshot returns with error state', async () => {
    waitForMock.waitForConditionWithTimeout.mockImplementation((func: any) => {
      return func();
    });
    createSnapshotMock.mockResolvedValue({ SnapshotId: 'volumeId1' });
    describeSnapshotMock.mockResolvedValue({
      Snapshots: [
        {
          SnapshotId: 'volumeId1',
          State: SnapshotState.error,
          StateMessage: 'Snapshot creation failed',
        },
      ],
    });

    await expect(
      createEbsSnapshot({
        credentials,
        region: 'region1',
        volumeId: 'volumeId1',
        waitForInSeconds: 10,
        dryRun: true,
      }),
    ).rejects.toThrow(
      'Snapshot creation failed with error: Snapshot creation failed',
    );
    expect(describeSnapshotMock).toHaveBeenCalledTimes(1);
    expect(describeSnapshotMock).toHaveBeenCalledWith({
      SnapshotIds: ['volumeId1'],
      DryRun: true,
    });
    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
  });

  test('should not wait for if no number is provided', async () => {
    createSnapshotMock.mockResolvedValue({ SnapshotId: 'volumeId1' });
    describeSnapshotMock.mockResolvedValue({
      Snapshots: [
        {
          SnapshotId: 'volumeId1',
          State: SnapshotState.error,
          StateMessage: 'Snapshot creation failed',
        },
      ],
    });

    const result = (await createEbsSnapshot({
      credentials,
      region: 'region1',
      volumeId: 'volumeId1',
      dryRun: false,
    })) as any;
    expect(result).toStrictEqual({ SnapshotId: 'volumeId1' });
    expect(describeSnapshotMock).not.toHaveBeenCalled();
    expect(waitForMock.waitForConditionWithTimeout).not.toHaveBeenCalled();
    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
  });
});
