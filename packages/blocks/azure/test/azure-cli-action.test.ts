const azureCliMock = {
  runCommand: jest.fn(),
};

jest.mock('../src/lib/azure-cli', () => azureCliMock);

import { azureCliAction } from '../src/lib/actions/azure-cli-action';

const auth = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some region',
};

describe('azureCliAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create action with correct properties', () => {
    expect(azureCliAction.props).toMatchObject({
      commandToRun: {
        type: 'LONG_TEXT',
        required: true,
      },
      useHostSession: {
        type: 'DYNAMIC',
        required: true,
      },
      subscriptions: {
        type: 'DYNAMIC',
        required: true,
      },
      dryRun: {
        type: 'CHECKBOX',
        required: false,
      },
    });
  });

  test('should skip the execution when dry run is active', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      propsValue: {
        dryRun: true,
        commandToRun: 'az account list-locations --output table',
      },
    };

    const result = await azureCliAction.run(context);
    expect(result).toEqual(
      "Step execution skipped, dry run flag enabled. Azure CLI command will not be executed. Command: 'az account list-locations --output table'",
    );

    expect(azureCliMock.runCommand).not.toHaveBeenCalled();
  });

  test('should return the output as-is', async () => {
    azureCliMock.runCommand.mockResolvedValue('something here');

    const context = createContext({
      commandToRun: 'az account list-locations --output table',
      useHostSession: { useHostSessionCheckbox: false },
      subscriptions: { subDropdown: 'subscriptionId' },
    });

    const result = await azureCliAction.run(context);

    expect(result).toStrictEqual('something here');
    expect(azureCliMock.runCommand).toHaveBeenCalledTimes(1);
    expect(azureCliMock.runCommand).toHaveBeenCalledWith(
      'az account list-locations --output table',
      auth,
      false,
      'subscriptionId',
    );
  });

  test('should pass useHostSession to runCommand', async () => {
    azureCliMock.runCommand.mockResolvedValue('something here');

    const context = createContext({
      commandToRun: 'az account list-locations --output table',
      useHostSession: { useHostSessionCheckbox: true },
      subscriptions: { subDropdown: 'subscriptionId' },
    });

    const result = await azureCliAction.run(context);

    expect(result).toStrictEqual('something here');
    expect(azureCliMock.runCommand).toHaveBeenCalledTimes(1);
    expect(azureCliMock.runCommand).toHaveBeenCalledWith(
      'az account list-locations --output table',
      auth,
      true,
      'subscriptionId',
    );
  });

  test('should throw an error if runCommand fails and return the whole error when command does not contain login credentials', async () => {
    azureCliMock.runCommand.mockRejectedValue('error');

    const context = createContext({
      commandToRun: 'az account list-locations --output table',
      useHostSession: { useHostSessionCheckbox: false },
      subscriptions: { subDropdown: 'subscriptionId' },
    });

    await expect(azureCliAction.run(context)).rejects.toThrow(
      'An error occurred while running an Azure CLI command: error',
    );
    expect(azureCliMock.runCommand).toHaveBeenCalledTimes(1);
    expect(azureCliMock.runCommand).toHaveBeenCalledWith(
      'az account list-locations --output table',
      auth,
      false,
      'subscriptionId',
    );
  });

  test('should throw an error if runCommand fails and return the redacted error when command contains login credentials', async () => {
    azureCliMock.runCommand.mockRejectedValue(
      'login --service-principal blah blah error',
    );

    const context = createContext({
      commandToRun: 'az account list-locations --output table',
      useHostSession: { useHostSessionCheckbox: false },
      subscriptions: { subDropdown: 'subscriptionId' },
    });

    await expect(azureCliAction.run(context)).rejects.toThrow(
      'An error occurred while running an Azure CLI command: login --service-principal ***REDACTED***',
    );
    expect(azureCliMock.runCommand).toHaveBeenCalledTimes(1);
    expect(azureCliMock.runCommand).toHaveBeenCalledWith(
      'az account list-locations --output table',
      auth,
      false,
      'subscriptionId',
    );
  });
});

function createContext(propsValue?: any) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: auth,
    propsValue: propsValue,
  };
}
