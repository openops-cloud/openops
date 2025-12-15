const getOrThrowMock = jest.fn();
const getNumberMock = jest.fn();
const getSerializedObjectMock = jest.fn();
const setSerializedObjectMock = jest.fn();

jest.mock('@openops/server-shared', () => ({
  AppSystemProp: {
    TABLES_TOKEN_LIFETIME_MINUTES: 'TABLES_TOKEN_LIFETIME_MINUTES',
    OPENOPS_ADMIN_EMAIL: 'OPENOPS_ADMIN_EMAIL',
  },
  system: {
    getOrThrow: getOrThrowMock,
    getNumber: getNumberMock,
  },
  cacheWrapper: {
    getSerializedObject: getSerializedObjectMock,
    setSerializedObject: setSerializedObjectMock,
  },
}));

const getUserByEmailOrThrowMock = jest.fn().mockResolvedValue({});
jest.mock('../../../src/app/user/user-service', () => ({
  userService: {
    getUserByEmailOrThrow: getUserByEmailOrThrowMock,
  },
}));

const authenticateUserInOpenOpsTablesMock = jest.fn();
jest.mock('@openops/common', () => ({
  authenticateUserInOpenOpsTables: authenticateUserInOpenOpsTablesMock,
}));

import { authenticateAdminUserInOpenOpsTables } from '../../../src/app/openops-tables/auth-admin-tables';

describe('Authenticate admin user in OpenOps Tables', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const user = {
      id: 'u1',
      password: 'secret',
    };

    getUserByEmailOrThrowMock.mockResolvedValue(user);
  });

  it('returns cached tokens when available', async () => {
    const cached = { token: 't1', refresh_token: 'r1' };
    getSerializedObjectMock.mockResolvedValue(cached);

    const res = await authenticateAdminUserInOpenOpsTables();

    expect(getSerializedObjectMock).toHaveBeenCalledWith(
      'openops-tables-token',
    );
    expect(authenticateUserInOpenOpsTablesMock).not.toHaveBeenCalled();
    expect(res).toEqual(cached);
  });

  it('authenticates and caches tokens when cache is empty with computed ttl', async () => {
    getSerializedObjectMock.mockResolvedValue(undefined);
    getNumberMock.mockReturnValue(30);
    getOrThrowMock
      .mockReturnValueOnce('admin@example.com')
      .mockReturnValueOnce('secret');
    const tokens = { token: 't2', refresh_token: 'r2' };
    authenticateUserInOpenOpsTablesMock.mockResolvedValue(tokens);

    const axiosRetryConfig = { retries: 2 };
    const res = await authenticateAdminUserInOpenOpsTables(axiosRetryConfig);

    expect(getOrThrowMock).toHaveBeenNthCalledWith(1, 'OPENOPS_ADMIN_EMAIL');
    expect(authenticateUserInOpenOpsTablesMock).toHaveBeenCalledWith(
      'admin@example.com',
      'secret',
      axiosRetryConfig,
    );
    expect(setSerializedObjectMock).toHaveBeenCalledWith(
      'openops-tables-token',
      tokens,
      1200,
    );
    expect(res).toEqual(tokens);
  });

  it('authenticates and caches tokens without ttl when TABLES_TOKEN_LIFETIME_MINUTES is undefined', async () => {
    getSerializedObjectMock.mockResolvedValue(undefined);
    getNumberMock.mockReturnValue(undefined);
    getOrThrowMock
      .mockReturnValueOnce('admin2@example.com')
      .mockReturnValueOnce('pwd');
    const tokens = { token: 't3', refresh_token: 'r3' };
    authenticateUserInOpenOpsTablesMock.mockResolvedValue(tokens);

    const res = await authenticateAdminUserInOpenOpsTables();

    expect(setSerializedObjectMock).toHaveBeenCalledWith(
      'openops-tables-token',
      tokens,
      undefined,
    );
    expect(res).toEqual(tokens);
  });
});
