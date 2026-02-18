import { evaluateConditional } from '../../../../../src/app/benchmark/providers/aws/aws-conditional-step-resolver';

describe('evaluateConditional', () => {
  const projectId = 'project-123';
  const provider = 'aws';

  it('returns true for hasMultipleAccounts', async () => {
    const result = await evaluateConditional('hasMultipleAccounts', {
      projectId,
      provider,
    });
    // Returns true until we implement real evaluation (see hasMultipleAccounts in aws-conditional-step-resolver).
    expect(result).toBe(true);
  });

  it('throws with method name in message for unknown conditional method', async () => {
    await expect(
      evaluateConditional('unknownWhen', { projectId, provider }),
    ).rejects.toThrow('Unknown AWS conditional method: unknownWhen');
  });
});
