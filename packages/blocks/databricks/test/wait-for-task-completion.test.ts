import { makeHttpRequest } from '@openops/common';
import { RETRY_TIMEOUT_MILLISECONDS } from '../src/lib/common/constants';
import { waitForTaskCompletion } from '../src/lib/common/wait-for-task-completion';

jest.mock('@openops/common', () => ({
  makeHttpRequest: jest.fn(),
}));

const mockMakeHttpRequest = makeHttpRequest as jest.Mock;

describe('waitForTaskCompletion', () => {
  const headers = {} as any;
  const runId = 123;
  const workspaceDeploymentName = 'my-workspace';

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((fn: (...args: any[]) => void) => {
        Promise.resolve().then(fn);
        return 0 as unknown as NodeJS.Timeout;
      });
  });

  it('returns output when job completes successfully', async () => {
    mockMakeHttpRequest
      .mockResolvedValueOnce({
        metadata: { state: { life_cycle_state: 'RUNNING' } },
      })
      .mockResolvedValueOnce({
        metadata: { state: { life_cycle_state: 'TERMINATED' }, result: 'done' },
      });

    const result = await waitForTaskCompletion({
      workspaceDeploymentName,
      runId,
      headers,
      timeoutInSeconds: 10,
    });

    expect(result.metadata.state.life_cycle_state).toBe('TERMINATED');
    expect(mockMakeHttpRequest).toHaveBeenCalledTimes(2);
  });

  it('returns immediately if job is already completed', async () => {
    mockMakeHttpRequest.mockResolvedValueOnce({
      metadata: { state: { life_cycle_state: 'TERMINATED' } },
    });

    const result = await waitForTaskCompletion({
      workspaceDeploymentName,
      runId,
      headers,
      timeoutInSeconds: 5,
    });

    expect(result.metadata.state.life_cycle_state).toBe('TERMINATED');
    expect(mockMakeHttpRequest).toHaveBeenCalledTimes(1);
  });

  it('keeps retrying until timeout and returns last output', async () => {
    const attempts = 3;
    const timeoutInSeconds =
      ((attempts - 1) * RETRY_TIMEOUT_MILLISECONDS) / 1000;

    mockMakeHttpRequest.mockResolvedValue({
      metadata: { state: { life_cycle_state: 'RUNNING' } },
    });

    const result = await waitForTaskCompletion({
      workspaceDeploymentName,
      runId,
      headers,
      timeoutInSeconds,
    });

    expect(mockMakeHttpRequest).toHaveBeenCalledTimes(attempts);
    expect(result.metadata.state.life_cycle_state).toBe('RUNNING');
  });
});
