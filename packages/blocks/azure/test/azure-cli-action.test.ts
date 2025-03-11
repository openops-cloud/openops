const systemMock = {
  getNumber: jest.fn(),
  getBoolean: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  SharedSystemProp: {
    OPS_ENABLE_HOST_SESSION: 'OPS_ENABLE_HOST_SESSION',
  },
  system: systemMock,
}));

const commonMock = {
  ...jest.requireActual('@openops/common'),
  getAzureSubscriptionsStaticDropdown: jest.fn(),
};

jest.mock('@openops/common', () => commonMock);

const azureCliMock = {
  runCommand: jest.fn(),
};

jest.mock('../src/lib/actions/azure-cli', () => azureCliMock);

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

  test('useHostSession should have checkbox if OPS_ENABLE_HOST_SESSION=true', async () => {
    systemMock.getBoolean.mockReturnValue(true);
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {},
    };

    const result = await azureCliAction.props['useHostSession'].props(
      {},
      context,
    );

    expect(result['useHostSessionCheckbox']).toMatchObject({
      displayName: 'Use host machine Azure CLI session',
      type: 'CHECKBOX',
    });
  });

  test('useHostSession should be empty if OPS_ENABLE_HOST_SESSION=false', async () => {
    systemMock.getBoolean.mockReturnValue(false);
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {},
    };

    const result = await azureCliAction.props['useHostSession'].props(
      {},
      context,
    );

    expect(result).toStrictEqual({});
  });

  test('subscriptions have dropdown if useHostSessionCheckbox is false', async () => {
    commonMock.getAzureSubscriptionsStaticDropdown.mockResolvedValue({
      displayName: 'Subscriptions',
      type: 'STATIC_DROPDOWN',
    });
    const context = createContext();

    const result = await azureCliAction.props['subscriptions'].props(
      { auth, useHostSession: { useHostSessionCheckbox: false } },
      context,
    );

    expect(
      commonMock.getAzureSubscriptionsStaticDropdown,
    ).toHaveBeenCalledTimes(1);
    expect(commonMock.getAzureSubscriptionsStaticDropdown).toHaveBeenCalledWith(
      auth,
    );
    expect(result['subDropdown']).toMatchObject({
      displayName: 'Subscriptions',
      type: 'STATIC_DROPDOWN',
    });
  });

  test('subscriptions be filled from cli account list if useHostSessionCheckbox is true', async () => {
    azureCliMock.runCommand.mockResolvedValue(
      JSON.stringify([{ name: 'someName', id: 'someId' }]),
    );
    const context = createContext();

    const result = await azureCliAction.props['subscriptions'].props(
      { auth, useHostSession: { useHostSessionCheckbox: true } },
      context,
    );

    expect(azureCliMock.runCommand).toHaveBeenCalledTimes(1);
    expect(azureCliMock.runCommand).toHaveBeenCalledWith(
      'account list --only-show-errors',
      auth,
      true,
      undefined,
    );
    expect(
      commonMock.getAzureSubscriptionsStaticDropdown,
    ).not.toHaveBeenCalled();
    expect(result['subDropdown']).toStrictEqual({
      displayName: 'Subscriptions',
      description: 'Select a single subscription from the list',
      required: true,
      options: {
        disabled: false,
        options: [
          {
            label: 'someName',
            value: 'someId',
          },
        ],
      },
      type: 'STATIC_DROPDOWN',
      valueSchema: undefined,
    });
  });

  test.each([
    new Error(JSON.stringify({ error_description: 'some error' })),
    'some error',
  ])('subscriptions show an error property if it exists', async (error) => {
    commonMock.getAzureSubscriptionsStaticDropdown.mockRejectedValue(error);
    const context = createContext();

    const result = await azureCliAction.props['subscriptions'].props(
      { auth, useHostSession: { useHostSessionCheckbox: false } },
      context,
    );

    expect(
      commonMock.getAzureSubscriptionsStaticDropdown,
    ).toHaveBeenCalledTimes(1);
    expect(commonMock.getAzureSubscriptionsStaticDropdown).toHaveBeenCalledWith(
      auth,
    );
    expect(result['subDropdown']).toStrictEqual({
      displayName: 'Subscriptions',
      description: 'Select a single subscription from the list',
      required: true,
      options: {
        disabled: true,
        options: [],
        placeholder: 'Something went wrong fetching subscriptions',
        error: 'some error',
      },
      type: 'STATIC_DROPDOWN',
      valueSchema: undefined,
    });
  });

  test('subscriptions have placeholder if no auth was provided', async () => {
    commonMock.getAzureSubscriptionsStaticDropdown.mockRejectedValue(
      'some error',
    );
    const context = createContext();

    const result = await azureCliAction.props['subscriptions'].props(
      {},
      context,
    );

    expect(result['subDropdown']).toStrictEqual({
      displayName: 'Subscriptions',
      description: 'Select a single subscription from the list',
      required: true,
      options: {
        disabled: true,
        options: [],
        placeholder: 'Please authenticate first',
      },
      type: 'STATIC_DROPDOWN',
      valueSchema: undefined,
    });
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

  test('should throw an error if runCommand fails', async () => {
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
});

function createContext(propsValue?: any) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: auth,
    propsValue: propsValue,
  };
}
