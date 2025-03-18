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

jest.mock('../src/lib/azure-cli', () => azureCliMock);

import { subDropdown, useHostSession } from '../src/lib/common-properties';

const auth = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some region',
};

describe('useHostSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('useHostSession should have checkbox if OPS_ENABLE_HOST_SESSION=true', async () => {
    systemMock.getBoolean.mockReturnValue(true);
    const context = createContext();

    const result = await useHostSession.props({}, context);

    expect(result['useHostSessionCheckbox']).toMatchObject({
      displayName: 'Use host machine Azure CLI session',
      type: 'CHECKBOX',
    });
  });

  test('useHostSession should be empty if OPS_ENABLE_HOST_SESSION=false', async () => {
    systemMock.getBoolean.mockReturnValue(false);
    const context = createContext();

    const result = (await useHostSession.props({}, context)) as any;

    expect(result).toStrictEqual({});
  });
});

describe('subDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('subscriptions have dropdown if useHostSessionCheckbox is false', async () => {
    commonMock.getAzureSubscriptionsStaticDropdown.mockResolvedValue({
      displayName: 'Subscriptions',
      type: 'STATIC_DROPDOWN',
    });
    const context = createContext();

    const result = await subDropdown.props(
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

    const result = await subDropdown.props(
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

    const result = await subDropdown.props(
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

    const result = await subDropdown.props({}, context);

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
});

function createContext(propsValue?: any) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: auth,
    propsValue: propsValue,
  };
}
