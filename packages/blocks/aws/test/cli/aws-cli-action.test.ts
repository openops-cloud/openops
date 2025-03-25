const awsCliMock = {
  runCommand: jest.fn(),
};

const openOpsMock = {
  ...jest.requireActual('@openops/common'),
  getCredentialsForAccount: jest.fn(),
  tryParseJson: jest.fn((input) => input),
  handleCliError: jest.fn(),
};

jest.mock('@openops/common', () => openOpsMock);
jest.mock('../../src/lib/actions/cli/aws-cli', () => awsCliMock);

import { awsCliAction } from '../../src/lib/actions/cli/aws-cli-action';

const auth = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some region',
};

describe('awsCliAction single account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openOpsMock.getCredentialsForAccount.mockResolvedValue(auth);
  });

  test('should create action with correct properties', () => {
    expect(awsCliAction.props).toMatchObject({
      commandToRun: {
        type: 'LONG_TEXT',
        required: true,
      },
      dryRun: {
        type: 'CHECKBOX',
        required: false,
      },
    });
  });

  test('should return expected result', async () => {
    awsCliMock.runCommand.mockResolvedValue('result');

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,

      propsValue: {
        commandToRun: 'aws s3api list-buckets --output json',
        account: { accounts: 'account' },
      },
    };

    const result = await awsCliAction.run(context);

    expect(result).toStrictEqual('result');
    expect(openOpsMock.getCredentialsForAccount).toHaveBeenCalledTimes(1);
    expect(awsCliMock.runCommand).toHaveBeenCalledTimes(1);
    expect(awsCliMock.runCommand).toHaveBeenCalledWith(
      'aws s3api list-buckets --output json',
      auth.defaultRegion,
      auth,
    );
    expect(openOpsMock.tryParseJson).toHaveBeenCalledTimes(1);
    expect(openOpsMock.tryParseJson).toHaveBeenCalledWith('result');
  });

  test('should call handleCliError if something fails', async () => {
    awsCliMock.runCommand.mockRejectedValue('error');

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        commandToRun: 'aws s3api list-buckets --output json',
        account: { accounts: 'account' },
      },
    };

    await awsCliAction.run(context);
    expect(awsCliMock.runCommand).toHaveBeenCalledTimes(1);
    expect(awsCliMock.runCommand).toHaveBeenCalledWith(
      'aws s3api list-buckets --output json',
      auth.defaultRegion,
      auth,
    );

    expect(openOpsMock.handleCliError).toHaveBeenCalledTimes(1);
    expect(openOpsMock.handleCliError).toHaveBeenCalledWith({
      provider: 'AWS',
      command: 'aws s3api list-buckets --output json',
      error: 'error',
    });
  });

  test('should skip the execution when dry run is active', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        commandToRun: 'aws s3api list-buckets --output json',
        account: { accounts: 'account' },
        dryRun: true,
      },
    };

    const result = await awsCliAction.run(context);
    expect(result).toEqual(
      "Step execution skipped, dry run flag enabled. AWS CLI command will not be executed. Command: 'aws s3api list-buckets --output json'",
    );

    expect(awsCliMock.runCommand).not.toHaveBeenCalled();
  });
});
