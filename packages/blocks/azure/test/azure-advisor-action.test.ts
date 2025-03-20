const azureCliMock = {
  runCommand: jest.fn(),
};

jest.mock('../src/lib/azure-cli', () => azureCliMock);

import { advisorAction } from '../src/lib/actions/azure-advisor-action';

const auth = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some region',
};

describe('advisorAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create action with correct properties', () => {
    expect(Object.keys(advisorAction.props).length).toBe(4);
    expect(advisorAction.props).toMatchObject({
      useHostSession: {
        type: 'DYNAMIC',
        required: true,
      },
      subscriptions: {
        type: 'DYNAMIC',
        required: true,
      },
      filterBySelection: {
        type: 'STATIC_DROPDOWN',
        required: true,
        options: {
          options: [
            { label: 'No filter', value: {} },
            {
              label: 'Filter by Resource IDs',
              value: {
                resourceIds: {
                  type: 'ARRAY',
                  required: true,
                },
              },
            },
            {
              label: 'Filter by Resource Group',
              value: {
                resourceGroup: {
                  type: 'SHORT_TEXT',
                  required: true,
                },
              },
            },
          ],
        },
      },
      filterByProperty: {
        type: 'DYNAMIC',
        required: false,
      },
    });
  });

  test('should return the output as-is', async () => {
    azureCliMock.runCommand.mockResolvedValue('something here');

    const context = createContext({
      useHostSession: { useHostSessionCheckbox: false },
      subscriptions: { subDropdown: 'subscriptionId' },
    });

    const result = await advisorAction.run(context);

    expect(result).toStrictEqual('something here');
    expect(azureCliMock.runCommand).toHaveBeenCalledTimes(1);
    expect(azureCliMock.runCommand).toHaveBeenCalledWith(
      `az advisor recommendation list --category 'cost' --output json`,
      auth,
      false,
      'subscriptionId',
    );
  });

  test.each([
    [
      {
        useHostSession: { useHostSessionCheckbox: true },
      },
      `az advisor recommendation list --category 'cost' --output json`,
    ],
    [
      {
        useHostSession: { useHostSessionCheckbox: false },
      },
      `az advisor recommendation list --category 'cost' --output json`,
    ],
    [
      {
        filterByProperty: { resourceIds: ['id1', 'id2'] },
      },
      `az advisor recommendation list --category 'cost' --output json --ids "id1" "id2"`,
    ],
    [
      {
        filterByProperty: { resourceGroup: 'some resource group' },
      },
      `az advisor recommendation list --category 'cost' --output json --resource-group some resource group`,
    ],
  ])(
    'should pass all properties to runCommand',
    async (context: any, runCliCommand: any) => {
      azureCliMock.runCommand.mockResolvedValue('something here');

      const result = await advisorAction.run(
        createContext({
          subscriptions: { subDropdown: 'subscriptionId' },
          ...context,
        }),
      );

      expect(result).toStrictEqual('something here');
      expect(azureCliMock.runCommand).toHaveBeenCalledTimes(1);
      expect(azureCliMock.runCommand).toHaveBeenCalledWith(
        runCliCommand,
        auth,
        context.useHostSession?.useHostSessionCheckbox,
        'subscriptionId',
      );
    },
  );

  test('should throw an error if runCommand fails and return the whole error if command contains login credentials', async () => {
    azureCliMock.runCommand.mockRejectedValue('error');

    const context = createContext({
      useHostSession: { useHostSessionCheckbox: false },
      subscriptions: { subDropdown: 'subscriptionId' },
    });

    await expect(advisorAction.run(context)).rejects.toThrow(
      'An error occurred while fetching Azure cost recommendations: error',
    );
    expect(azureCliMock.runCommand).toHaveBeenCalledTimes(1);
    expect(azureCliMock.runCommand).toHaveBeenCalledWith(
      `az advisor recommendation list --category 'cost' --output json`,
      auth,
      false,
      'subscriptionId',
    );
  });

  test('should throw an error if runCommand fails and return the redacted error if command does not contains login credentials', async () => {
    azureCliMock.runCommand.mockRejectedValue(
      'login --service-principal blah blah error',
    );

    const context = createContext({
      useHostSession: { useHostSessionCheckbox: false },
      subscriptions: { subDropdown: 'subscriptionId' },
    });

    await expect(advisorAction.run(context)).rejects.toThrow(
      'An error occurred while fetching Azure cost recommendations: login --service-principal ***REDACTED***',
    );
    expect(azureCliMock.runCommand).toHaveBeenCalledTimes(1);
    expect(azureCliMock.runCommand).toHaveBeenCalledWith(
      `az advisor recommendation list --category 'cost' --output json`,
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
