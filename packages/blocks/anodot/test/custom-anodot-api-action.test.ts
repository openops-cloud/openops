jest.mock('@openops/blocks-common', () => ({
  ...jest.requireActual('@openops/blocks-common'),
  httpClient: { sendRequest: jest.fn() },
}));

jest.mock('../src/lib/common/anodot-requests-helpers', () => ({
  buildUserAccountApiKey: jest.fn(() => 'apiKey'),
  createAnodotAuthHeaders: jest.fn(() => ({
    Authorization: 'token',
    'x-api-key': 'apiKey',
  })),
}));

jest.mock('../src/lib/common/auth', () => ({
  authenticateUserWithAnodot: jest.fn(() =>
    Promise.resolve({ apikey: 'apiKey', Authorization: 'token' }),
  ),
}));

import { httpClient } from '@openops/blocks-common';
import * as helpers from '../src/lib/common/anodot-requests-helpers';
import { customAnodotApiAction } from '../src/lib/custom-anodot-api-action';

describe('customAnodotApiAction', () => {
  const baseContext = {
    auth: {
      authUrl: 'authUrl',
      username: 'user',
      password: 'pass',
      apiUrl: 'https://api',
    },
    propsValue: {
      selectedAccount: { accountKey: 'acc', divisionId: 'div' },
      method: 'GET',
      url: { url: 'https://api/endpoint' },
      queryParams: undefined,
      body: undefined,
      failsafe: false,
      timeout: undefined,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('merges headers if headers is provided', async () => {
    const headers = { 'X-Custom': 'value' };
    const context = {
      ...baseContext,
      propsValue: { ...baseContext.propsValue, headers },
    };

    await customAnodotApiAction.run(context as any);

    expect(helpers.createAnodotAuthHeaders).toHaveBeenCalled();
    expect(httpClient.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'token',
          'x-api-key': 'apiKey',
          'X-Custom': 'value',
        }),
      }),
    );
  });

  test('does not merge headers if headers is not provided', async () => {
    const context = {
      ...baseContext,
      propsValue: { ...baseContext.propsValue, headers: undefined },
    };

    await customAnodotApiAction.run(context as any);

    expect(helpers.createAnodotAuthHeaders).toHaveBeenCalled();
    expect(httpClient.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { Authorization: 'token', 'x-api-key': 'apiKey' },
      }),
    );
  });
});
