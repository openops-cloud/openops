const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  getCredentialsForAccount: jest.fn(),
  initiateRdsInstanceDeletion: jest.fn(),
  waitForProperties: jest.fn().mockReturnValue({
    shouldWaitForCreation: {
      required: true,
      type: 'CHECKBOX',
      displayName: 'Should wait for Operation to Complete',
    },
    waitForDynamicProp: {},
  }),
};

jest.mock('@openops/common', () => openopsCommonMock);

const auth = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some defaultRegion',
};

import { rdsDeleteInstanceAction } from '../../src/lib/actions/rds/rds-delete-instance-action';

describe('rdsDeleteInstanceAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openopsCommonMock.getCredentialsForAccount.mockResolvedValue(auth);
  });

  test('should create action with correct properties', () => {
    expect(rdsDeleteInstanceAction.props).toMatchObject({
      arn: {
        required: true,
        type: 'SHORT_TEXT',
      },
      shouldWaitForCreation: {
        type: 'CHECKBOX',
        required: true,
      },
      takeSnapshot: {
        type: 'CHECKBOX',
        required: false,
      },
      snapshotIdentifier: {
        type: 'SHORT_TEXT',
        required: false,
      },
      dryRun: {
        type: 'CHECKBOX',
        required: false,
      },
    });
  });

  test('should use the correct credentials', async () => {
    openopsCommonMock.initiateRdsInstanceDeletion.mockResolvedValue(
      'mockResult',
    );

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        arn: 'arn:aws:rds:us-west-2:123456789012:db:mysql-db-instance1',
        waitForTimeInSecondsProperty: {},
      },
    };

    const result = (await rdsDeleteInstanceAction.run(context)) as any;

    expect(result).toEqual('mockResult');
    expect(openopsCommonMock.getCredentialsForAccount).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getCredentialsForAccount).toHaveBeenCalledWith(
      context.auth,
      '123456789012',
    );
  });

  test('should throw an error when initiateRdsInstanceDeletion throws error', async () => {
    openopsCommonMock.initiateRdsInstanceDeletion.mockRejectedValue(
      new Error('mockError'),
    );

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        arn: `arn:aws:rds:us-west-2:123456789012:db:mysql-db-instance1`,
        waitForTimeInSecondsProperty: {},
      },
    };

    await expect(rdsDeleteInstanceAction.run(context)).rejects.toThrow(
      'mockError',
    );
  });

  test('should call initiateRdsInstanceDeletion with given input', async () => {
    openopsCommonMock.initiateRdsInstanceDeletion.mockResolvedValue(
      'mockResult',
    );

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        arn: `arn:aws:rds:us-west-2:123456789012:db:mysql-db-instance1`,
        shouldWaitForCreation: true,
        waitForTimeInSecondsProperty: { waitForTimeInSeconds: 10 },
        takeSnapshot: true,
        snapshotIdentifier: 'custom-snapshot-name',
        dryRun: false,
      },
    };

    const result = (await rdsDeleteInstanceAction.run(context)) as any;
    expect(result).toEqual('mockResult');

    expect(openopsCommonMock.initiateRdsInstanceDeletion).toHaveBeenCalledTimes(
      1,
    );
    expect(openopsCommonMock.initiateRdsInstanceDeletion).toHaveBeenCalledWith(
      auth,
      'us-west-2',
      'mysql-db-instance1',
      true,
      10,
      'custom-snapshot-name',
    );
  });

  test('should skip the execution when dry run is active', async () => {
    openopsCommonMock.initiateRdsInstanceDeletion.mockResolvedValue(
      'mockResult',
    );

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        arn: `arn:aws:rds:us-west-2:123456789012:db:mysql-db-instance1`,
        shouldWaitForCreation: true,
        waitForTimeInSecondsProperty: { waitForTimeInSeconds: 10 },
        takeSnapshot: true,
        dryRun: true,
      },
    };

    const result = (await rdsDeleteInstanceAction.run(context)) as any;
    expect(result).toEqual('Step execution skipped, dry run flag enabled');

    expect(
      openopsCommonMock.initiateRdsInstanceDeletion,
    ).not.toHaveBeenCalled();
  });
});
