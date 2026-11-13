const createUmbrellaSessionMock = jest.fn();
const listUmbrellaAccountsMock = jest.fn();

jest.mock('../src/lib/common/auth', () => ({
  ...jest.requireActual('../src/lib/common/auth'),
  createUmbrellaSession: createUmbrellaSessionMock,
}));

jest.mock('../src/lib/common/umbrella-accounts', () => ({
  listUmbrellaAccounts: listUmbrellaAccountsMock,
}));

import { anadotAuth } from '../src/lib/anodot-auth-property';
import {
  UmbrellaAuthProps,
  UserManagementVersion,
} from '../src/lib/common/auth';

const baseAuth: UmbrellaAuthProps = {
  authUrl: 'https://tokenizer.example/prod',
  apiUrl: 'https://api.example/api',
  username: 'user',
  password: 'pass',
};

const tokens = { Authorization: 'bearer', apikey: 'user-key:-1' };

function sessionFor(version: UserManagementVersion) {
  return { version, apiUrl: baseAuth.apiUrl, tokens };
}

/**
 * Mirrors the real helper: the version comes from the explicit override when
 * given (the validator's cross-probe), otherwise from the auth value.
 */
function mockSessionCreation() {
  createUmbrellaSessionMock.mockImplementation(
    async (auth: UmbrellaAuthProps, override?: UserManagementVersion) => {
      const version =
        override ?? (auth.userManagementVersion === '2.0' ? '2.0' : '1.0');
      return sessionFor(version);
    },
  );
}

async function validate(auth: UmbrellaAuthProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (anadotAuth as any).validate({ auth });
}

describe('anadotAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionCreation();
  });

  test('should declare the version selector as optional with 2.0 default', () => {
    expect(anadotAuth.props['userManagementVersion']).toMatchObject({
      displayName: 'User Management version',
      required: false,
      type: 'STATIC_DROPDOWN',
      defaultValue: '2.0',
    });
  });

  test('should validate a connection without a version using the 1.0 path', async () => {
    listUmbrellaAccountsMock.mockResolvedValue([{ accountId: '1' }]);

    const result = await validate(baseAuth);

    expect(result).toEqual({ valid: true });
    expect(createUmbrellaSessionMock).toHaveBeenCalledTimes(1);
    expect(createUmbrellaSessionMock).toHaveBeenCalledWith(baseAuth);
    expect(listUmbrellaAccountsMock).toHaveBeenCalledWith(sessionFor('1.0'));
  });

  test('should validate a 2.0 connection using the 2.0 path', async () => {
    listUmbrellaAccountsMock.mockResolvedValue([{ accountId: '1' }]);
    const auth = { ...baseAuth, userManagementVersion: '2.0' };

    const result = await validate(auth);

    expect(result).toEqual({ valid: true });
    expect(createUmbrellaSessionMock).toHaveBeenCalledWith(auth);
    expect(listUmbrellaAccountsMock).toHaveBeenCalledWith(sessionFor('2.0'));
  });

  test('should report an authentication error when login fails', async () => {
    createUmbrellaSessionMock.mockRejectedValue(new Error('Unauthorized'));

    const result = await validate(baseAuth);

    expect(result).toEqual({
      valid: false,
      error: 'Error validating authentication.',
    });
    expect(listUmbrellaAccountsMock).not.toHaveBeenCalled();
  });

  test('should hint 2.0 when a 1.0 connection cannot list accounts but 2.0 can', async () => {
    listUmbrellaAccountsMock
      .mockRejectedValueOnce(new Error('Forbidden'))
      .mockResolvedValueOnce([{ accountId: '1' }]);

    const result = await validate(baseAuth);

    expect(result).toEqual({
      valid: false,
      error:
        "This user appears to be on User Management 2.0. Change the 'User Management version' setting.",
    });
    expect(createUmbrellaSessionMock).toHaveBeenNthCalledWith(1, baseAuth);
    expect(createUmbrellaSessionMock).toHaveBeenNthCalledWith(
      2,
      baseAuth,
      '2.0',
    );
    expect(listUmbrellaAccountsMock).toHaveBeenNthCalledWith(
      2,
      sessionFor('2.0'),
    );
  });

  test('should hint 1.0 when a 2.0 connection cannot list accounts but 1.0 can', async () => {
    listUmbrellaAccountsMock
      .mockRejectedValueOnce(new Error('Accounts service error'))
      .mockResolvedValueOnce([{ accountId: '1' }]);
    const auth = { ...baseAuth, userManagementVersion: '2.0' };

    const result = await validate(auth);

    expect(result).toEqual({
      valid: false,
      error:
        "This user appears to be on User Management 1.0. Change the 'User Management version' setting.",
    });
    expect(createUmbrellaSessionMock).toHaveBeenNthCalledWith(2, auth, '1.0');
  });

  test('should report an API access error when both versions fail to list accounts', async () => {
    listUmbrellaAccountsMock.mockRejectedValue(new Error('down'));

    const result = await validate(baseAuth);

    expect(result).toEqual({
      valid: false,
      error: 'Error validating API access.',
    });
    expect(listUmbrellaAccountsMock).toHaveBeenCalledTimes(2);
  });

  test('should report an API access error, not an auth error, when the probe login fails', async () => {
    listUmbrellaAccountsMock.mockRejectedValue(new Error('Forbidden'));
    createUmbrellaSessionMock
      .mockResolvedValueOnce(sessionFor('1.0'))
      .mockRejectedValueOnce(new Error('probe login failed'));

    const result = await validate(baseAuth);

    expect(result).toEqual({
      valid: false,
      error: 'Error validating API access.',
    });
  });
});
