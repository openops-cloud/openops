const makeOpenOpsTablesPatchMock = jest.fn();
const createAxiosHeadersMock = jest.fn();

jest.mock('../../src/lib/openops-tables/requests-helpers', () => {
  return {
    makeOpenOpsTablesPatch: makeOpenOpsTablesPatchMock,
  };
});

jest.mock('../../src/lib/openops-tables/create-axios-headers', () => ({
  createAxiosHeaders: createAxiosHeadersMock,
}));

import { resetUserPassword } from '../../src/lib/openops-tables/reset-user-password';

describe('resetUserPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call patch with correct params', async () => {
    createAxiosHeadersMock.mockReturnValue('headers');
    makeOpenOpsTablesPatchMock.mockResolvedValue(undefined);

    await resetUserPassword('user@example.com', 'pass123', 'token');

    expect(createAxiosHeadersMock).toHaveBeenCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
    expect(makeOpenOpsTablesPatchMock).toHaveBeenCalledTimes(1);
    expect(makeOpenOpsTablesPatchMock).toHaveBeenCalledWith(
      'api/admin/users/',
      { username: 'user@example.com', password: 'pass123' },
      'headers',
    );
  });

  it('should propagate errors from patch', async () => {
    createAxiosHeadersMock.mockReturnValue('headers');
    makeOpenOpsTablesPatchMock.mockRejectedValue(new Error('fail'));

    await expect(
      resetUserPassword('user@example.com', 'pass123', 'token'),
    ).rejects.toThrow('fail');

    expect(makeOpenOpsTablesPatchMock).toHaveBeenCalledTimes(1);
  });
});
