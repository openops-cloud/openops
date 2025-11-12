const makeHttpRequestMock = jest.fn();
const authenticateUserWithAzureMock = jest.fn();

const openOpsMock = {
  ...jest.requireActual('@openops/common'),
  getUseHostSessionProperty: jest.fn().mockReturnValue({
    type: 'DYNAMIC',
    required: true,
  }),
  makeHttpRequest: makeHttpRequestMock,
  authenticateUserWithAzure: authenticateUserWithAzureMock,
};

jest.mock('@openops/common', () => openOpsMock);

const azureCliMock = {
  runCommand: jest.fn(),
};

jest.mock('../src/lib/azure-cli', () => azureCliMock);

import { azureResourceGraphAction } from '../src/lib/actions/azure-resource-graph-action';

const auth = {
  clientId: 'some-client-id',
  clientSecret: 'some-client-secret',
  tenantId: 'some-tenant-id',
};

describe('azureResourceGraphAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authenticateUserWithAzureMock.mockResolvedValue({
      access_token: 'mock-access-token',
    });
  });

  test('should execute simple query', async () => {
    const mockResponse = {
      data: [{ id: 'resource1' }, { id: 'resource2' }],
    };

    makeHttpRequestMock.mockResolvedValue(mockResponse);

    const context = createContext({
      useHostSession: { useHostSessionCheckbox: false },
      subscriptionsDropdown: {},
      query: 'resources | project *',
      querySubscriptions: ['sub-1'],
      limitSubscriptions: false,
      subscriptionLimit: {},
    });

    const result = (await azureResourceGraphAction.run(context)) as {
      totalRecords: number;
      data: unknown[];
    };

    expect(result.totalRecords).toBe(2);
    expect(result.data).toEqual(mockResponse.data);
    expect(makeHttpRequestMock).toHaveBeenCalledTimes(1);
  });

  test('should handle pagination', async () => {
    makeHttpRequestMock
      .mockResolvedValueOnce({
        data: Array.from({ length: 100 }, (_, i) => ({ id: `r${i}` })),
        $skipToken: 'token-1',
      })
      .mockResolvedValueOnce({
        data: Array.from({ length: 100 }, (_, i) => ({ id: `r${i + 100}` })),
        $skipToken: 'token-2',
      })
      .mockResolvedValueOnce({
        data: Array.from({ length: 50 }, (_, i) => ({ id: `r${i + 200}` })),
      });

    const context = createContext({
      useHostSession: { useHostSessionCheckbox: false },
      subscriptionsDropdown: {},
      query: 'resources | project *',
      querySubscriptions: ['sub-1'],
      limitSubscriptions: false,
      subscriptionLimit: {},
    });

    const result = (await azureResourceGraphAction.run(context)) as {
      totalRecords: number;
      data: unknown[];
    };

    expect(result.totalRecords).toBe(250);
    expect(result.data.length).toBe(250);
    expect(makeHttpRequestMock).toHaveBeenCalledTimes(3);
  });

  test('should respect maxResults limit', async () => {
    makeHttpRequestMock
      .mockResolvedValueOnce({
        data: Array.from({ length: 100 }, (_, i) => ({ id: `r${i}` })),
        $skipToken: 'token-1',
      })
      .mockResolvedValueOnce({
        data: Array.from({ length: 100 }, (_, i) => ({ id: `r${i + 100}` })),
      });

    const context = createContext({
      useHostSession: { useHostSessionCheckbox: false },
      subscriptionsDropdown: {},
      query: 'resources | project *',
      querySubscriptions: ['sub-1'],
      limitSubscriptions: false,
      subscriptionLimit: {},
      maxResults: 150,
    });

    const result = (await azureResourceGraphAction.run(context)) as {
      totalRecords: number;
      data: unknown[];
    };

    expect(result.totalRecords).toBe(150);
    expect(result.data.length).toBe(150);
    expect(makeHttpRequestMock).toHaveBeenCalledTimes(2);
  });

  test('should batch subscriptions over 1000', async () => {
    const subs = Array.from({ length: 1500 }, (_, i) => `sub-${i}`);
    makeHttpRequestMock.mockResolvedValue({ data: [{ id: 'r1' }] });

    const context = createContext({
      useHostSession: { useHostSessionCheckbox: false },
      subscriptionsDropdown: {},
      query: 'resources | project *',
      querySubscriptions: subs,
      limitSubscriptions: false,
      subscriptionLimit: {},
    });

    await azureResourceGraphAction.run(context);

    expect(makeHttpRequestMock).toHaveBeenCalledTimes(2);
    expect(makeHttpRequestMock.mock.calls[0][3].subscriptions).toHaveLength(
      1000,
    );
    expect(makeHttpRequestMock.mock.calls[1][3].subscriptions).toHaveLength(
      500,
    );
  });

  test('should use host session credentials', async () => {
    azureCliMock.runCommand.mockResolvedValue(
      JSON.stringify({ accessToken: 'host-token' }),
    );
    makeHttpRequestMock.mockResolvedValue({ data: [{ id: 'r1' }] });

    const context = createContext({
      useHostSession: { useHostSessionCheckbox: true },
      subscriptionsDropdown: { subDropdown: 'host-sub' },
      query: 'resources | project *',
      querySubscriptions: ['sub-1'],
      limitSubscriptions: false,
      subscriptionLimit: {},
    });

    await azureResourceGraphAction.run(context);

    expect(azureCliMock.runCommand).toHaveBeenCalled();
    expect(makeHttpRequestMock).toHaveBeenCalledWith(
      'POST',
      expect.anything(),
      expect.objectContaining({
        Authorization: 'Bearer host-token',
      }),
      expect.anything(),
    );
  });

  test('should limit subscriptions when enabled', async () => {
    const subs = Array.from({ length: 1500 }, (_, i) => `sub-${i}`);
    makeHttpRequestMock.mockResolvedValue({ data: [{ id: 'r1' }] });

    const context = createContext({
      useHostSession: { useHostSessionCheckbox: false },
      subscriptionsDropdown: {},
      query: 'resources | project *',
      querySubscriptions: subs,
      limitSubscriptions: true,
      subscriptionLimit: { limit: 500 },
    });

    await azureResourceGraphAction.run(context);

    expect(makeHttpRequestMock).toHaveBeenCalledTimes(1);
    expect(makeHttpRequestMock.mock.calls[0][3].subscriptions).toHaveLength(
      500,
    );
  });

  test('should not limit subscriptions when disabled', async () => {
    const subs = Array.from({ length: 1500 }, (_, i) => `sub-${i}`);
    makeHttpRequestMock.mockResolvedValue({ data: [{ id: 'r1' }] });

    const context = createContext({
      useHostSession: { useHostSessionCheckbox: false },
      subscriptionsDropdown: {},
      query: 'resources | project *',
      querySubscriptions: subs,
      limitSubscriptions: false,
      subscriptionLimit: {},
    });

    await azureResourceGraphAction.run(context);

    expect(makeHttpRequestMock).toHaveBeenCalledTimes(2);
    expect(makeHttpRequestMock.mock.calls[0][3].subscriptions).toHaveLength(
      1000,
    );
    expect(makeHttpRequestMock.mock.calls[1][3].subscriptions).toHaveLength(
      500,
    );
  });
});

function createContext(propsValue?: unknown) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth,
    propsValue,
  };
}
