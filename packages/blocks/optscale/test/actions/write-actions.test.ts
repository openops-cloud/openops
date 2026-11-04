import { HttpMethod } from '@openops/blocks-common';
import { RiskLevel } from '@openops/shared';
import { assignResourceAction } from '../../src/lib/actions/assign-resource-action';
import { setPoolBudgetAction } from '../../src/lib/actions/set-pool-budget-action';
import { updateRecommendationStatusAction } from '../../src/lib/actions/update-recommendation-status-action';
import { sendOptScaleRequest } from '../../src/lib/common/make-request';
import { auth, createContext } from './test-helpers';

jest.mock('../../src/lib/common/make-request', () => ({
  sendOptScaleRequest: jest.fn(),
}));

const sendMock = sendOptScaleRequest as jest.Mock;

describe('updateRecommendationStatusAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendMock.mockResolvedValue({ id: 'r-1', dismissed_recommendations: {} });
  });

  test.each(['dismiss', 'activate'])(
    'sends the %s action for the resource',
    async (action) => {
      const result = await updateRecommendationStatusAction.run(
        createContext({
          resourceId: ' r-1 ',
          recommendationType: 'rightsizing_instances',
          action,
        }),
      );

      expect(result).toEqual({ id: 'r-1', dismissed_recommendations: {} });
      expect(sendMock).toHaveBeenCalledWith({
        auth,
        method: HttpMethod.PATCH,
        path: '/resources/r-1/optimizations',
        body: { action, recommendation: 'rightsizing_instances' },
      });
    },
  );

  test.each(['obsolete_images', 'short_living_instances'])(
    'rejects %s without calling the API',
    async (recommendationType) => {
      await expect(
        updateRecommendationStatusAction.run(
          createContext({
            resourceId: 'r-1',
            recommendationType,
            action: 'dismiss',
          }),
        ),
      ).rejects.toThrow('does not support dismissing or activating');
      expect(sendMock).not.toHaveBeenCalled();
    },
  );

  test('does not offer non-dismissible types', () => {
    const options = (
      updateRecommendationStatusAction.props.recommendationType as any
    ).options.options.map((o: { value: string }) => o.value);

    expect(options).toContain('rightsizing_instances');
    expect(options).not.toContain('obsolete_images');
    expect(options).not.toContain('short_living_instances');
  });
});

describe('assignResourceAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendMock.mockResolvedValue({ succeeded: ['r-1'], failed: [] });
  });

  test('bulk assigns resources to the pool and owner', async () => {
    const result = await assignResourceAction.run(
      createContext({
        organizationId: 'org-1',
        resourceIds: ['r-1', ' r-2 ', ''],
        poolId: 'p-1',
        ownerId: 'e-1',
      }),
    );

    expect(result).toEqual({ succeeded: ['r-1'], failed: [] });
    expect(sendMock).toHaveBeenCalledWith({
      auth,
      method: HttpMethod.POST,
      path: '/organizations/org-1/assignments/bulk',
      body: { resource_ids: ['r-1', 'r-2'], pool_id: 'p-1', owner_id: 'e-1' },
    });
  });

  test('requires at least one resource ID', async () => {
    await expect(
      assignResourceAction.run(
        createContext({
          organizationId: 'org-1',
          resourceIds: [' '],
          poolId: 'p-1',
          ownerId: 'e-1',
        }),
      ),
    ).rejects.toThrow('At least one resource ID is required');
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('setPoolBudgetAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendMock.mockResolvedValue({ id: 'p-1', limit: 500 });
  });

  test('patches the pool limit', async () => {
    const result = await setPoolBudgetAction.run(
      createContext({ organizationId: 'org-1', poolId: 'p-1', limit: 500 }),
    );

    expect(result).toEqual({ id: 'p-1', limit: 500 });
    expect(sendMock).toHaveBeenCalledWith({
      auth,
      method: HttpMethod.PATCH,
      path: '/pools/p-1',
      body: { limit: 500 },
    });
  });

  test('allows removing the limit with zero', async () => {
    await setPoolBudgetAction.run(
      createContext({ organizationId: 'org-1', poolId: 'p-1', limit: 0 }),
    );

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: { limit: 0 } }),
    );
  });

  test('rejects a negative limit', async () => {
    await expect(
      setPoolBudgetAction.run(
        createContext({ organizationId: 'org-1', poolId: 'p-1', limit: -1 }),
      ),
    ).rejects.toThrow('Monthly Budget cannot be negative');
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('write action metadata', () => {
  test.each([
    [updateRecommendationStatusAction, RiskLevel.LOW],
    [assignResourceAction, RiskLevel.LOW],
    [setPoolBudgetAction, RiskLevel.MEDIUM],
  ])('%#: is a write action with a risk level', (action, riskLevel) => {
    expect(action.isWriteAction).toBe(true);
    expect(action.riskLevel).toBe(riskLevel);
  });
});
