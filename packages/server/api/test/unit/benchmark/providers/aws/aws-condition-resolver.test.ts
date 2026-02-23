import { ApplicationError, ErrorCode } from '@openops/shared';
import { evaluateCondition } from '../../../../../src/app/benchmark/providers/aws/aws-condition-resolver';

const mockGetConnectionAccounts = jest.fn();
jest.mock(
  '../../../../../src/app/benchmark/providers/aws/aws-option-resolver',
  () => ({
    getConnectionAccounts: (
      ...args: unknown[]
    ): ReturnType<typeof mockGetConnectionAccounts> =>
      mockGetConnectionAccounts(...args),
  }),
);

describe('evaluateCondition', () => {
  const projectId = 'project-123';
  const provider = 'aws';
  const defaultContext = { projectId, provider };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true for hasMultipleAccounts when connection has more than one account', async () => {
    mockGetConnectionAccounts.mockResolvedValue([
      { id: '111111111111', displayName: 'Account One' },
      { id: '222222222222', displayName: 'Account Two' },
    ]);

    const result = await evaluateCondition(
      'hasMultipleAccounts',
      defaultContext,
    );

    expect(mockGetConnectionAccounts).toHaveBeenCalledWith(defaultContext);
    expect(result).toBe(true);
  });

  it('returns false for hasMultipleAccounts when connection has one account', async () => {
    mockGetConnectionAccounts.mockResolvedValue([
      { id: '111111111111', displayName: 'Only' },
    ]);

    const result = await evaluateCondition(
      'hasMultipleAccounts',
      defaultContext,
    );

    expect(result).toBe(false);
  });

  it('returns false for hasMultipleAccounts when connection has zero accounts', async () => {
    mockGetConnectionAccounts.mockResolvedValue([]);

    const result = await evaluateCondition(
      'hasMultipleAccounts',
      defaultContext,
    );

    expect(result).toBe(false);
  });

  it('returns false for hasMultipleAccounts when getConnectionAccounts throws validation error', async () => {
    mockGetConnectionAccounts.mockRejectedValue(
      new ApplicationError(
        {
          code: ErrorCode.VALIDATION,
          params: { message: 'Connection must be selected to list accounts' },
        },
        'Connection must be selected to list accounts',
      ),
    );

    const result = await evaluateCondition(
      'hasMultipleAccounts',
      defaultContext,
    );

    expect(result).toBe(false);
  });

  it('rethrows non-validation errors from getConnectionAccounts', async () => {
    const networkError = new Error('Network failure');
    mockGetConnectionAccounts.mockRejectedValue(networkError);

    await expect(
      evaluateCondition('hasMultipleAccounts', defaultContext),
    ).rejects.toThrow('Network failure');
  });

  it('throws with condition name for unknown condition', async () => {
    await expect(
      evaluateCondition('unknownCondition', defaultContext),
    ).rejects.toThrow('Unknown AWS condition method: unknownCondition');
    expect(mockGetConnectionAccounts).not.toHaveBeenCalled();
  });
});
