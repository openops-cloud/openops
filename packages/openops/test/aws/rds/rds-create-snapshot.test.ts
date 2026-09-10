const createDBSnapshotCommandMock = jest.fn();

jest.mock('@aws-sdk/client-rds', () => {
  return {
    ...jest.requireActual('@aws-sdk/client-rds'),
    CreateDBSnapshotCommand: createDBSnapshotCommandMock,
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
import { faker } from '@faker-js/faker';
import { initiateRdsSnapshotCreation } from '../../../src/lib/aws/rds/rds-create-snapshot';

const credentials = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some defaultRegion',
};

describe('initiateRdsSnapshotCreation', () => {
  let fakeDate: Date;
  let fakeTime: number;

  beforeEach(() => {
    jest.clearAllMocks();

    fakeDate = faker.date.past();
    fakeTime = fakeDate.getTime();
    jest.spyOn(Date, 'now').mockImplementation(() => fakeTime);
  });

  createDBSnapshotCommandMock.mockImplementation(
    (params: RDS.CreateDBSnapshotCommandInput) => {
      return {
        input: {
          DBInstanceIdentifier: params.DBInstanceIdentifier,
          DBSnapshotIdentifier: params.DBSnapshotIdentifier,
          Tags: params.Tags,
        },
      };
    },
  );

  sendMock.mockImplementation((params: RDS.CreateDBSnapshotCommand) => {
    return Promise.resolve({
      SnapshotId: params.input.DBSnapshotIdentifier,
      DBInstanceIdentifier: params.input.DBInstanceIdentifier,
      Tags: params.input.Tags,
    });
  });

  test('should initiate  creation rds snapshot', async () => {
    const result = await initiateRdsSnapshotCreation({
      credentials,
      region: 'some-region1',
      dbInstanceId: 'some instance id',
      snapshotId: 'some snapshotId',
    });

    expect(awsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
    expect(awsClientMock.getAwsClient).toHaveBeenCalledWith(
      RDS.RDS,
      credentials,
      'some-region1',
    );
    expect(result).toMatchObject({
      DBInstanceIdentifier: 'some instance id',
      SnapshotId: 'some snapshotId',
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  test(`should throw when send mock throws`, async () => {
    sendMock.mockRejectedValueOnce(new Error('some error'));

    await expect(
      initiateRdsSnapshotCreation({
        credentials,
        region: 'some-region1',
        dbInstanceId: 'some instance id',
        snapshotId: 'some snapshotId',
      }),
    ).rejects.toThrow('Create RDS Snapshot failed with error: some error');

    expect(sendMock).toHaveBeenCalledTimes(1);

    expect(createDBSnapshotCommandMock).toHaveBeenCalledWith({
      DBSnapshotIdentifier: 'some snapshotId',
      DBInstanceIdentifier: 'some instance id',
      Tags: undefined,
    });
  });

  test.each([undefined, null, {}, '', []])(
    'should create a snapshot without tags if none are provided %p',
    async (inputTags) => {
      const result = await initiateRdsSnapshotCreation({
        credentials,
        region: 'some-region1',
        dbInstanceId: 'some instance id',
        snapshotId: 'some snapshotId',
        tags: inputTags,
      });

      expect(awsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
      expect(awsClientMock.getAwsClient).toHaveBeenCalledWith(
        RDS.RDS,
        credentials,
        'some-region1',
      );
      expect(result).toMatchObject({
        DBInstanceIdentifier: 'some instance id',
        SnapshotId: 'some snapshotId',
        Tags: undefined,
      });
      expect(sendMock).toHaveBeenCalledTimes(1);

      expect(createDBSnapshotCommandMock).toHaveBeenCalledWith({
        DBSnapshotIdentifier: 'some snapshotId',
        DBInstanceIdentifier: 'some instance id',
        Tags: undefined,
      });
    },
  );

  test('should create snapshot with tags if provided', async () => {
    const tags: Record<string, unknown> = {
      tag1: 'value1',
      tag2: 'value2',
      tag3: 123,
    };
    const result = await initiateRdsSnapshotCreation({
      credentials,
      region: 'some-region1',
      dbInstanceId: 'some instance id',
      snapshotId: 'some snapshotId',
      tags,
    });

    expect(awsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
    expect(awsClientMock.getAwsClient).toHaveBeenCalledWith(
      RDS.RDS,
      credentials,
      'some-region1',
    );
    expect(result).toMatchObject({
      DBInstanceIdentifier: 'some instance id',
      SnapshotId: 'some snapshotId',
      Tags: [
        { Key: 'tag1', Value: 'value1' },
        { Key: 'tag2', Value: 'value2' },
        { Key: 'tag3', Value: 123 },
      ],
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(createDBSnapshotCommandMock).toHaveBeenCalledWith({
      DBSnapshotIdentifier: 'some snapshotId',
      DBInstanceIdentifier: 'some instance id',
      Tags: [
        { Key: 'tag1', Value: 'value1' },
        { Key: 'tag2', Value: 'value2' },
        { Key: 'tag3', Value: 123 },
      ],
    });
  });

  test.each([undefined, null, ''])(
    'should create snapshot id if none is provided %p',
    async (snapshotIdInput) => {
      describeRdsSnapshotsMock.describeRdsSnapshots.mockResolvedValue([
        { SnapshotId: 'snapshotId', Status: 'deleting' },
      ]);

      const result = await initiateRdsSnapshotCreation({
        credentials,
        region: 'some-region1',
        dbInstanceId: 'some instance id',
        snapshotId: snapshotIdInput,
      });

      expect(result).toMatchObject({
        DBInstanceIdentifier: 'some instance id',
        SnapshotId: `some instance id-${fakeTime}`,
      });

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(awsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
      expect(createDBSnapshotCommandMock).toHaveBeenCalledWith({
        DBInstanceIdentifier: 'some instance id',
        DBSnapshotIdentifier: `some instance id-${fakeTime}`,
        Tags: undefined,
      });
    },
  );

  test('should wait for if number is provided', async () => {
    waitForMock.waitForConditionWithTimeout.mockImplementationOnce((func) =>
      func(),
    );
    describeRdsSnapshotsMock.describeRdsSnapshots.mockResolvedValue([
      { SnapshotId: 'snapshotId', Status: 'deleting' },
    ]);

    const result = await initiateRdsSnapshotCreation({
      credentials,
      region: 'some-region1',
      dbInstanceId: 'some instance id',
      snapshotId: 'some snapshotId',
      waitForInSeconds: 300,
    });
    expect(result).toMatchObject({
      DBInstanceIdentifier: 'some instance id',
      SnapshotId: 'some snapshotId',
    });
    expect(waitForMock.waitForConditionWithTimeout).toHaveBeenCalledTimes(1);
    expect(waitForMock.waitForConditionWithTimeout).toHaveBeenCalledWith(
      expect.any(Function),
      300,
      2000,
      `Snapshot creation timed out`,
    );
    expect(awsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
    expect(describeRdsSnapshotsMock.describeRdsSnapshots).toHaveBeenCalledTimes(
      1,
    );
  });

  test('should not wait for if no number is provided', async () => {
    const result = await initiateRdsSnapshotCreation({
      credentials,
      region: 'some-region1',
      dbInstanceId: 'some instance id',
      snapshotId: 'some snapshotId',
    });

    expect(result).toMatchObject({
      DBInstanceIdentifier: 'some instance id',
      SnapshotId: 'some snapshotId',
    });
    expect(
      describeRdsSnapshotsMock.describeRdsSnapshots,
    ).not.toHaveBeenCalled();
    expect(waitForMock.waitForConditionWithTimeout).not.toHaveBeenCalled();
  });
});
