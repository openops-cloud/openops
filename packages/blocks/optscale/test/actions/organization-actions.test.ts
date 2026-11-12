import { HttpMethod } from '@openops/blocks-common';
import { getDataSourcesAction } from '../../src/lib/actions/get-data-sources-action';
import { getEmployeesAction } from '../../src/lib/actions/get-employees-action';
import { getOrganizationsAction } from '../../src/lib/actions/get-organizations-action';
import { getPoolsAction } from '../../src/lib/actions/get-pools-action';
import { sendOptScaleRequest } from '../../src/lib/common/make-request';
import { auth, createContext } from './test-helpers';

jest.mock('../../src/lib/common/make-request', () => ({
  ...jest.requireActual('../../src/lib/common/make-request'),
  sendOptScaleRequest: jest.fn(),
}));

const sendMock = sendOptScaleRequest as jest.Mock;

describe('organization read actions', () => {
  beforeEach(() => jest.clearAllMocks());

  test('get organizations returns the organization list', async () => {
    sendMock.mockResolvedValue({
      organizations: [{ id: 'org-1' }],
      total_count: 1,
    });

    const result = await getOrganizationsAction.run(createContext());

    expect(result).toEqual([{ id: 'org-1' }]);
    expect(sendMock).toHaveBeenCalledWith({
      auth,
      method: HttpMethod.GET,
      path: '/organizations',
    });
  });

  test('get data sources requests details', async () => {
    sendMock.mockResolvedValue({ cloud_accounts: [{ id: 'ca-1' }] });

    const result = await getDataSourcesAction.run(
      createContext({ organizationId: 'org-1' }),
    );

    expect(result).toEqual([{ id: 'ca-1' }]);
    expect(sendMock).toHaveBeenCalledWith({
      auth,
      method: HttpMethod.GET,
      path: '/organizations/org-1/cloud_accounts',
      query: { details: true },
    });
  });

  test('get pools fetches the root pool tree of the organization', async () => {
    sendMock
      .mockResolvedValueOnce({ id: 'org-1', pool_id: 'pool-root' })
      .mockResolvedValueOnce({ id: 'pool-root', children: [] });

    const result = await getPoolsAction.run(
      createContext({ organizationId: 'org-1' }),
    );

    expect(result).toEqual({ id: 'pool-root', children: [] });
    expect(sendMock).toHaveBeenNthCalledWith(1, {
      auth,
      method: HttpMethod.GET,
      path: '/organizations/org-1',
    });
    expect(sendMock).toHaveBeenNthCalledWith(2, {
      auth,
      method: HttpMethod.GET,
      path: '/pools/pool-root',
      query: { children: true, details: true },
    });
  });

  test('get employees returns the employee list', async () => {
    sendMock.mockResolvedValue({ employees: [{ id: 'e-1' }] });

    const result = await getEmployeesAction.run(
      createContext({ organizationId: 'org-1' }),
    );

    expect(result).toEqual([{ id: 'e-1' }]);
    expect(sendMock).toHaveBeenCalledWith({
      auth,
      method: HttpMethod.GET,
      path: '/organizations/org-1/employees',
    });
  });

  test('propagates request errors', async () => {
    sendMock.mockRejectedValue(new Error('OptScale API error 403: Forbidden'));

    await expect(
      getEmployeesAction.run(createContext({ organizationId: 'org-1' })),
    ).rejects.toThrow('OptScale API error 403: Forbidden');
  });

  test('all are read-only actions', () => {
    for (const action of [
      getOrganizationsAction,
      getDataSourcesAction,
      getPoolsAction,
      getEmployeesAction,
    ]) {
      expect(action.isWriteAction).toBe(false);
    }
  });
});
