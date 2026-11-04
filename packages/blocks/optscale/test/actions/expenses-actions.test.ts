import { HttpMethod } from '@openops/blocks-common';
import { getExpensesAction } from '../../src/lib/actions/get-expenses-action';
import { getExpensesBreakdownAction } from '../../src/lib/actions/get-expenses-breakdown-action';
import { sendOptScaleRequest } from '../../src/lib/common/make-request';
import { auth, createContext } from './test-helpers';

jest.mock('../../src/lib/common/make-request', () => ({
  sendOptScaleRequest: jest.fn(),
}));

const sendMock = sendOptScaleRequest as jest.Mock;

const period = {
  organizationId: 'org-1',
  startDate: '2026-01-01T00:00:00Z',
  endDate: '2026-01-31T23:59:59Z',
};

const unixPeriod = { start_date: 1767225600, end_date: 1769903999 };

const noFilters = {
  cloud_account_id: undefined,
  pool_id: undefined,
  owner_id: undefined,
  region: undefined,
  service_name: undefined,
  tag: undefined,
};

describe('getExpensesAction', () => {
  beforeEach(() => jest.clearAllMocks());

  test('requests clean expenses for the period with filters and paging', async () => {
    sendMock.mockResolvedValue({ clean_expenses: [], total_cost: 0 });

    const result = await getExpensesAction.run(
      createContext({
        ...period,
        poolIds: ['p-1'],
        tags: ['team'],
        limit: 100,
        offset: 200,
      }),
    );

    expect(result).toEqual({ clean_expenses: [], total_cost: 0 });
    expect(sendMock).toHaveBeenCalledWith({
      auth,
      method: HttpMethod.GET,
      path: '/organizations/org-1/clean_expenses',
      query: {
        ...unixPeriod,
        ...noFilters,
        pool_id: ['p-1'],
        tag: ['team'],
        limit: 100,
        offset: 200,
      },
    });
  });

  test('rejects an offset without a limit before calling the API', async () => {
    await expect(
      getExpensesAction.run(createContext({ ...period, offset: 10 })),
    ).rejects.toThrow('Offset requires a limit');
    expect(sendMock).not.toHaveBeenCalled();
  });

  test('rejects an invalid period', async () => {
    await expect(
      getExpensesAction.run(
        createContext({ ...period, startDate: '2026-02-01T00:00:00Z' }),
      ),
    ).rejects.toThrow('Start Date must be before End Date');
  });
});

describe('getExpensesBreakdownAction', () => {
  beforeEach(() => jest.clearAllMocks());

  test('requests the breakdown by the selected dimension', async () => {
    sendMock.mockResolvedValue({ breakdown: {} });

    await getExpensesBreakdownAction.run(
      createContext({
        ...period,
        breakdownBy: 'service_name',
        cloudAccountIds: ['ca-1'],
      }),
    );

    expect(sendMock).toHaveBeenCalledWith({
      auth,
      method: HttpMethod.GET,
      path: '/organizations/org-1/breakdown_expenses',
      query: {
        ...unixPeriod,
        ...noFilters,
        breakdown_by: 'service_name',
        cloud_account_id: ['ca-1'],
      },
    });
  });

  test('both are read-only actions', () => {
    expect(getExpensesAction.isWriteAction).toBe(false);
    expect(getExpensesBreakdownAction.isWriteAction).toBe(false);
  });
});
