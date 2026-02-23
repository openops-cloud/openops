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
  const contextWithConnection = {
    projectId,
    provider,
    benchmarkConfiguration: { connection: ['conn-123'] },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when connection has more than one account', async () => {
    mockGetConnectionAccounts.mockResolvedValue([
      { id: '111111111111', displayName: 'Account One' },
      { id: '222222222222', displayName: 'Account Two' },
    ]);

    const result = await evaluateCondition(
      'hasMultipleAccounts',
      contextWithConnection,
    );

    expect(mockGetConnectionAccounts).toHaveBeenCalledWith(
      contextWithConnection,
    );
    expect(result).toBe(true);
  });

  it('returns false when connection has one account', async () => {
    mockGetConnectionAccounts.mockResolvedValue([
      { id: '111111111111', displayName: 'Only' },
    ]);

    const result = await evaluateCondition(
      'hasMultipleAccounts',
      contextWithConnection,
    );

    expect(result).toBe(false);
  });

  it('returns false when connection has zero accounts', async () => {
    mockGetConnectionAccounts.mockResolvedValue([]);

    const result = await evaluateCondition(
      'hasMultipleAccounts',
      contextWithConnection,
    );

    expect(result).toBe(false);
  });

  it('throws for unknown condition', async () => {
    await expect(
      evaluateCondition('unknownCondition', contextWithConnection),
    ).rejects.toThrow('Unknown AWS condition method: unknownCondition');
    expect(mockGetConnectionAccounts).not.toHaveBeenCalled();
  });
});
