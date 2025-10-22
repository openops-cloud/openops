const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  getCredentialsForAccount: jest.fn(),
  modifyEbsVolume: jest.fn(),
  dryRunCheckBox: jest.fn().mockReturnValue({
    required: false,
    defaultValue: false,
    type: 'CHECKBOX',
  }),
  waitForProperties: jest.fn().mockReturnValue({
    shouldWaitForOperation: {
      required: false,
      type: 'CHECKBOX',
    },
    waitForTimeInSecondsProperty: {
      required: true,
      type: 'DYNAMIC',
    },
  }),
};

jest.mock('@openops/common', () => openopsCommonMock);

const auth = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some defaultRegion',
};

import { ebsModifyVolumeAction } from '../../src/lib/actions/ebs/ebs-modify-volume-action';

describe('modify ebs volumes action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openopsCommonMock.getCredentialsForAccount.mockResolvedValue(auth);
    openopsCommonMock.modifyEbsVolume.mockResolvedValue('mockResult');
  });

  test('should create action with correct properties', () => {
    expect(ebsModifyVolumeAction.props).toMatchObject({
      arn: {
        required: true,
        type: 'SHORT_TEXT',
      },
      changeVolumeType: {
        required: false,
        type: 'CHECKBOX',
      },
      newVolumeType: {
        required: true,
        type: 'DYNAMIC',
      },
      changeVolumeSize: {
        required: false,
        type: 'CHECKBOX',
      },
      newVolumeSize: {
        required: true,
        type: 'DYNAMIC',
      },
      changeVolumeIops: {
        required: false,
        type: 'CHECKBOX',
      },
      newVolumeIops: {
        required: true,
        type: 'DYNAMIC',
      },
      changeVolumeThroughput: {
        required: false,
        type: 'CHECKBOX',
      },
      newVolumeThroughput: {
        required: true,
        type: 'DYNAMIC',
      },
      dryRun: {
        required: false,
        type: 'CHECKBOX',
      },
      shouldWaitForOperation: {
        required: false,
        type: 'CHECKBOX',
      },
      waitForTimeInSecondsProperty: {
        required: true,
        type: 'DYNAMIC',
      },
    });
  });

  test('should use the correct credentials', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        arn: 'arn:aws:ec2:us-east-1:123456789012:volume/vol-1234567890abcdef0',
        waitForTimeInSecondsProperty: {},
      },
    };

    const result = (await ebsModifyVolumeAction.run(context)) as any;

    expect(result).toEqual('mockResult');
    expect(openopsCommonMock.getCredentialsForAccount).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getCredentialsForAccount).toHaveBeenCalledWith(
      context.auth,
      '123456789012',
    );
  });

  test('should throw an error when modifyEbsVolume throws error', async () => {
    openopsCommonMock.modifyEbsVolume.mockRejectedValue(new Error('mockError'));

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        arn: 'arn:aws:ec2:us-east-1:123456789012:volume/vol-1234567890abcdef0',
        waitForTimeInSecondsProperty: {},
      },
    };

    await expect(ebsModifyVolumeAction.run(context)).rejects.toThrow(
      'An error occurred while modifying EBS Volume: Error: mockError',
    );
  });

  test.each([true, false])(
    'should pass correct dryRun value to modifyEbsVolume',
    async (dryRun) => {
      const context = {
        ...jest.requireActual('@openops/blocks-framework'),
        auth: auth,
        propsValue: {
          arn: 'arn:aws:ec2:us-east-1:123456789012:volume/vol-1234567890abcdef0',
          dryRun,
          waitForTimeInSecondsProperty: {},
        },
      };

      const result = (await ebsModifyVolumeAction.run(context)) as any;
      expect(result).toEqual('mockResult');

      expect(openopsCommonMock.modifyEbsVolume).toHaveBeenCalledWith({
        credentials: auth,
        region: 'us-east-1',
        volumeId: 'vol-1234567890abcdef0',
        newConfiguration: {},
        dryRun,
        waitForInSeconds: undefined,
      });
    },
  );

  test('should pass the correct waitForTimeInSeconds to modifyEbsVolume', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        arn: 'arn:aws:ec2:us-east-1:123456789012:volume/vol-1234567890abcdef0',
        waitForTimeInSecondsProperty: {
          waitForTimeInSeconds: 100,
        },
        shouldWaitForOperation: true,
        dryRun: false,
      },
    };

    const result = (await ebsModifyVolumeAction.run(context)) as any;

    expect(result).toEqual('mockResult');
    expect(openopsCommonMock.modifyEbsVolume).toHaveBeenCalledWith({
      credentials: auth,
      region: 'us-east-1',
      volumeId: 'vol-1234567890abcdef0',
      newConfiguration: {},
      dryRun: false,
      waitForInSeconds: 100,
    });
  });

  test('should call modifyEbsVolume with correct newConfiguration when changeVolumeType is true', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        arn: 'arn:aws:ec2:us-east-1:123456789012:volume/vol-1234567890abcdef0',
        changeVolumeType: true,
        newVolumeType: {
          newVolumeType: 'gp2',
        },
        dryRun: false,
        waitForTimeInSecondsProperty: {},
      },
    };

    const result = (await ebsModifyVolumeAction.run(context)) as any;

    expect(result).toEqual('mockResult');
    expect(openopsCommonMock.modifyEbsVolume).toHaveBeenCalledWith({
      credentials: auth,
      region: 'us-east-1',
      volumeId: 'vol-1234567890abcdef0',
      newConfiguration: {
        volumeType: 'gp2',
      },
      dryRun: false,
      waitForInSeconds: undefined,
    });
  });

  test('should call modifyEbsVolume with correct newConfiguration when changeVolumeSize is true', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        arn: 'arn:aws:ec2:us-east-1:123456789012:volume/vol-1234567890abcdef0',
        changeVolumeSize: true,
        newVolumeSize: {
          newVolumeSize: 100,
        },
        dryRun: false,
        waitForTimeInSecondsProperty: {},
      },
    };

    const result = (await ebsModifyVolumeAction.run(context)) as any;

    expect(result).toEqual('mockResult');
    expect(openopsCommonMock.modifyEbsVolume).toHaveBeenCalledWith({
      credentials: auth,
      region: 'us-east-1',
      volumeId: 'vol-1234567890abcdef0',
      newConfiguration: {
        volumeSize: 100,
      },
      dryRun: false,
      waitForInSeconds: undefined,
    });
  });

  test('should call modifyEbsVolume with correct newConfiguration when changeVolumeIops is true', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        arn: 'arn:aws:ec2:us-east-1:123456789012:volume/vol-1234567890abcdef0',
        changeVolumeIops: true,
        newVolumeIops: {
          newVolumeIops: 100,
        },
        dryRun: false,
        waitForTimeInSecondsProperty: {},
      },
    };

    const result = (await ebsModifyVolumeAction.run(context)) as any;

    expect(result).toEqual('mockResult');
    expect(openopsCommonMock.modifyEbsVolume).toHaveBeenCalledWith({
      credentials: auth,
      region: 'us-east-1',
      volumeId: 'vol-1234567890abcdef0',
      newConfiguration: {
        volumeBaselineIOPS: 100,
      },
      dryRun: false,
      waitForInSeconds: undefined,
    });
  });

  test('should call modifyEbsVolume with correct newConfiguration when changeVolumeThroughput is true', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        arn: 'arn:aws:ec2:us-east-1:123456789012:volume/vol-1234567890abcdef0',
        changeVolumeThroughput: true,
        newVolumeThroughput: {
          newVolumeThroughput: 100,
        },
        dryRun: false,
        waitForTimeInSecondsProperty: {},
      },
    };

    const result = (await ebsModifyVolumeAction.run(context)) as any;

    expect(result).toEqual('mockResult');
    expect(openopsCommonMock.modifyEbsVolume).toHaveBeenCalledWith({
      credentials: auth,
      region: 'us-east-1',
      volumeId: 'vol-1234567890abcdef0',
      newConfiguration: {
        volumeBaselineThroughput: 100,
      },
      dryRun: false,
      waitForInSeconds: undefined,
    });
  });

  test('should call modifyEbsVolume with correct newConfiguration when multiple changes are true', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        arn: 'arn:aws:ec2:us-east-1:123456789012:volume/vol-1234567890abcdef0',
        changeVolumeType: true,
        newVolumeType: {
          newVolumeType: 'gp2',
        },
        changeVolumeSize: true,
        newVolumeSize: {
          newVolumeSize: 1,
        },
        changeVolumeIops: true,
        newVolumeIops: {
          newVolumeIops: 2,
        },
        changeVolumeThroughput: true,
        newVolumeThroughput: {
          newVolumeThroughput: 3,
        },
        dryRun: false,
        waitForTimeInSecondsProperty: {},
      },
    };

    const result = (await ebsModifyVolumeAction.run(context)) as any;

    expect(result).toEqual('mockResult');
    expect(openopsCommonMock.modifyEbsVolume).toHaveBeenCalledWith({
      credentials: auth,
      region: 'us-east-1',
      volumeId: 'vol-1234567890abcdef0',
      newConfiguration: {
        volumeType: 'gp2',
        volumeSize: 1,
        volumeBaselineIOPS: 2,
        volumeBaselineThroughput: 3,
      },
      dryRun: false,
      waitForInSeconds: undefined,
    });
  });
});
