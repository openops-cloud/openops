const authenticateUserWithAzureMock = jest.fn();

const openOpsMock = {
  ...jest.requireActual('@openops/common'),
  getUseHostSessionProperty: jest.fn().mockReturnValue({
    type: 'DYNAMIC',
    required: true,
  }),
  authenticateUserWithAzure: authenticateUserWithAzureMock,
};

jest.mock('@openops/common', () => openOpsMock);

import { HttpError } from '@openops/blocks-common';
import axios from 'axios';
import {
  customAzureApiCallAction,
  getRetryDelayMs,
} from '../src/lib/actions/custom-azure-api-action';

describe('customAzureApiCallAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    authenticateUserWithAzureMock.mockResolvedValue({
      access_token: 'mock-access-token',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('should retry 429 responses using Azure Cost Management retry header', async () => {
    jest
      .spyOn(axios, 'request')
      .mockRejectedValueOnce(
        buildAxiosError({
          status: 429,
          headers: {
            'x-ms-ratelimit-microsoft.costmanagement-entity-retry-after': '1',
          },
        }),
      )
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: { ok: true },
      } as any);

    const runPromise = customAzureApiCallAction.run(createContext() as any);

    await jest.runAllTimersAsync();

    await expect(runPromise).resolves.toEqual({
      status: 200,
      headers: {},
      body: { ok: true },
    });
  });

  test('should retry 429 responses using Azure Retail Prices retry header', async () => {
    jest
      .spyOn(axios, 'request')
      .mockRejectedValueOnce(
        buildAxiosError({
          status: 429,
          headers: {
            'x-ms-ratelimit-retailprices-retry-after': '60',
          },
        }),
      )
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: { ok: true },
      } as any);

    const runPromise = customAzureApiCallAction.run(createContext() as any);

    await jest.runAllTimersAsync();

    await expect(runPromise).resolves.toEqual({
      status: 200,
      headers: {},
      body: { ok: true },
    });
  });

  test('should use Azure Cost Management retry header delay', () => {
    expect(
      getRetryDelayMs(
        {
          'x-ms-ratelimit-microsoft.costmanagement-entity-retry-after': '1',
        },
        1,
      ),
    ).toBe(1000);
  });

  test('should use Azure Retail Prices retry header delay', () => {
    expect(
      getRetryDelayMs(
        {
          'x-ms-ratelimit-retailprices-retry-after': '60',
        },
        1,
      ),
    ).toBe(60000);
  });

  test('should use the longest Azure Cost Management retry header value', () => {
    expect(
      getRetryDelayMs(
        {
          'x-ms-ratelimit-microsoft.costmanagement-entity-retry-after': '3',
          'x-ms-ratelimit-microsoft.costmanagement-clienttype-retry-after': '1',
        },
        1,
      ),
    ).toBe(3000);
  });

  test('should retry 429 responses with fallback backoff when retry header is missing', () => {
    expect(getRetryDelayMs({}, 1)).toBe(60000);
  });

  test('should not retry non-429 responses', async () => {
    jest
      .spyOn(axios, 'request')
      .mockRejectedValueOnce(buildAxiosError({ status: 400 }));

    await expect(
      customAzureApiCallAction.run(createContext() as any),
    ).rejects.toBeInstanceOf(HttpError);
  });
});

function createContext(overrides?: Record<string, unknown>) {
  return {
    auth: {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      tenantId: 'tenant-id',
    },
    propsValue: {
      useHostSession: { useHostSessionCheckbox: false },
      subscriptions: {},
      url: {
        url: 'https://management.azure.com/subscriptions/sub-id/providers/Microsoft.CostManagement/query?api-version=2023-11-01',
      },
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      queryParams: {},
      body: {
        type: 'ActualCost',
        timeframe: 'LastMonth',
      },
      ...overrides,
    },
  };
}

function buildAxiosError({
  status,
  headers = {},
}: {
  status: number;
  headers?: Record<string, string>;
}) {
  return {
    isAxiosError: true,
    response: {
      status,
      headers,
      data: {
        error: {
          code: String(status),
          message: 'Request failed',
        },
      },
    },
  };
}
