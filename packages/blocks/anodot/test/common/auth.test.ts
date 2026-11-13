const systemMock = {
  get: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  system: systemMock,
}));

const makeHttpRequestMock = jest.fn();
jest.mock('@openops/common', () => {
  return {
    makeHttpRequest: makeHttpRequestMock,
  };
});

import { AxiosHeaders } from 'axios';
import {
  createUmbrellaSession,
  otherUserManagementVersion,
  resolveUserManagementVersion,
} from '../../src/lib/common/auth';

const jsonHeaders = new AxiosHeaders({ 'Content-Type': 'application/json' });

describe('resolveUserManagementVersion', () => {
  test.each([
    ['2.0', '2.0'],
    ['1.0', '1.0'],
    [undefined, '1.0'],
    [null, '1.0'],
    ['', '1.0'],
    ['3.0', '1.0'],
    [2, '1.0'],
  ])('should resolve %p to %p', (input, expected) => {
    expect(resolveUserManagementVersion(input)).toBe(expected);
  });
});

describe('otherUserManagementVersion', () => {
  test('should flip between the two versions', () => {
    expect(otherUserManagementVersion('1.0')).toBe('2.0');
    expect(otherUserManagementVersion('2.0')).toBe('1.0');
  });
});

describe('createUmbrellaSession', () => {
  const tokens = { Authorization: 'bearer', apikey: 'user-key:-1' };
  const baseAuth = {
    authUrl: 'https://tokenizer.example/prod',
    apiUrl: 'https://api.example/api',
    username: 'user',
    password: 'pass',
  };
  const credentials = { username: 'user', password: 'pass' };

  beforeEach(() => {
    jest.clearAllMocks();
    makeHttpRequestMock.mockResolvedValue(tokens);
  });

  it('should log in through the tokenizer when the version is absent', async () => {
    const session = await createUmbrellaSession(baseAuth);

    expect(session).toEqual({
      version: '1.0',
      apiUrl: baseAuth.apiUrl,
      tokens,
    });
    expect(makeHttpRequestMock).toHaveBeenCalledTimes(1);
    expect(makeHttpRequestMock).toHaveBeenCalledWith(
      'POST',
      'https://tokenizer.example/prod/credentials',
      jsonHeaders,
      credentials,
    );
  });

  it('should log in through the tokenizer when the version is 1.0', async () => {
    const session = await createUmbrellaSession({
      ...baseAuth,
      userManagementVersion: '1.0',
    });

    expect(session.version).toBe('1.0');
    expect(makeHttpRequestMock).toHaveBeenCalledWith(
      'POST',
      'https://tokenizer.example/prod/credentials',
      jsonHeaders,
      credentials,
    );
  });

  it('should log in through the token generate endpoint when the version is 2.0', async () => {
    const session = await createUmbrellaSession({
      ...baseAuth,
      userManagementVersion: '2.0',
    });

    expect(session).toEqual({
      version: '2.0',
      apiUrl: baseAuth.apiUrl,
      tokens,
    });
    expect(makeHttpRequestMock).toHaveBeenCalledWith(
      'POST',
      'https://api.example/api/v1/authentication/token/generate',
      jsonHeaders,
      credentials,
    );
  });

  it('should let an explicit version override the stored one', async () => {
    const session = await createUmbrellaSession(
      { ...baseAuth, userManagementVersion: '1.0' },
      '2.0',
    );

    expect(session.version).toBe('2.0');
    expect(makeHttpRequestMock).toHaveBeenCalledWith(
      'POST',
      'https://api.example/api/v1/authentication/token/generate',
      jsonHeaders,
      credentials,
    );
  });

  it('should propagate login failures', async () => {
    makeHttpRequestMock.mockRejectedValue(new Error('Unauthorized'));

    await expect(createUmbrellaSession(baseAuth)).rejects.toThrow(
      'Unauthorized',
    );
  });
});
