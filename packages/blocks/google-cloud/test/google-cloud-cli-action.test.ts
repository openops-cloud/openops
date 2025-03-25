const commonMock = {
  ...jest.requireActual('@openops/common'),
  runCliCommand: jest.fn(),
  tryParseJson: jest.fn((input) => input),
  handleCliError: jest.fn(),
  getUseHostSessionProperty: jest.fn().mockReturnValue({
    type: 'DYNAMIC',
    required: true,
  }),
};

jest.mock('@openops/common', () => commonMock);

const runCommandMock = jest.fn();
jest.mock('../src/lib/google-cloud-cli', () => ({
  runCommand: runCommandMock,
}));

import { googleCloudCliAction } from '../src/lib/actions/google-cloud-cli-action';

const auth = {
  keyFileContent: 'key file content',
};

describe('googleCloudCliAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create action with correct properties', () => {
    expect(googleCloudCliAction.props).toMatchObject({
      commandToRun: {
        type: 'LONG_TEXT',
        required: true,
      },
      useHostSession: {
        type: 'DYNAMIC',
        required: true,
      },
      project: {
        type: 'DROPDOWN',
        required: true,
      },
      dryRun: {
        type: 'CHECKBOX',
        required: false,
      },
    });
  });

  test('should skip execution on dry run', async () => {
    const context = createContext({ dryRun: true });
    const result = await googleCloudCliAction.run(context);

    expect(result).toContain('dry run flag enabled');
    expect(runCommandMock).not.toHaveBeenCalled();
  });

  test('should call runCommand with params', async () => {
    runCommandMock.mockResolvedValueOnce('result');
    const context = createContext({
      dryRun: false,
      project: 'some project',
      useHostSession: { useHostSessionCheckbox: true },
      commandToRun: 'gcloud compute instances list',
    });

    const result = await googleCloudCliAction.run(context);

    expect(runCommandMock).toHaveBeenCalledWith(
      'gcloud compute instances list',
      auth,
      true,
      'some project',
    );
    expect(commonMock.tryParseJson).toHaveBeenCalledWith('result');
    expect(result).toEqual('result');
  });

  test('should handle error using handleCliError', async () => {
    runCommandMock.mockRejectedValueOnce('error');
    const context = createContext({
      dryRun: false,
      project: 'some project',
      commandToRun: 'gcloud compute instances list',
    });

    await googleCloudCliAction.run(context);

    expect(commonMock.tryParseJson).not.toHaveBeenCalled();
    expect(commonMock.handleCliError).toHaveBeenCalledWith({
      provider: 'Google Cloud',
      command: 'gcloud compute instances list',
      error: 'error',
    });
  });
});

function createContext(propsValue?: any) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: auth,
    propsValue: propsValue,
  };
}
