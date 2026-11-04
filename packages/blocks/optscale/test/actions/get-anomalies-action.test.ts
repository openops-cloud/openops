import { HttpMethod } from '@openops/blocks-common';
import { getAnomaliesAction } from '../../src/lib/actions/get-anomalies-action';
import { sendOptScaleRequest } from '../../src/lib/common/make-request';
import { auth, createContext } from './test-helpers';

jest.mock('../../src/lib/common/make-request', () => ({
  sendOptScaleRequest: jest.fn(),
}));

const sendMock = sendOptScaleRequest as jest.Mock;

const constraints = [
  { id: 'c-1', type: 'expense_anomaly', limit_hits: [{ value: 79 }] },
  { id: 'c-2', type: 'tagging_policy', limit_hits: [] },
  { id: 'c-3', type: 'resource_quota' },
];

describe('getAnomaliesAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendMock.mockResolvedValue({ organization_constraints: constraints });
  });

  test('requests constraints with types and hit days', async () => {
    await getAnomaliesAction.run(
      createContext({
        organizationId: 'org-1',
        types: ['expense_anomaly', 'tagging_policy'],
        hitDays: 14,
        onlyViolated: false,
      }),
    );

    expect(sendMock).toHaveBeenCalledWith({
      auth,
      method: HttpMethod.GET,
      path: '/organizations/org-1/organization_constraints',
      query: { type: ['expense_anomaly', 'tagging_policy'], hit_days: 14 },
    });
  });

  test('returns only violated policies when requested', async () => {
    const result = await getAnomaliesAction.run(
      createContext({
        organizationId: 'org-1',
        hitDays: 7,
        onlyViolated: true,
      }),
    );

    expect(result).toEqual([constraints[0]]);
  });

  test('returns all policies otherwise', async () => {
    const result = await getAnomaliesAction.run(
      createContext({
        organizationId: 'org-1',
        hitDays: 7,
        onlyViolated: false,
      }),
    );

    expect(result).toEqual(constraints);
  });

  test('is a read-only action', () => {
    expect(getAnomaliesAction.isWriteAction).toBe(false);
  });
});
