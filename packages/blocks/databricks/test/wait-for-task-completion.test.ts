import { RETRY_TIMEOUT_MILLISECONDS } from '../src/lib/common/constants';
import { makeDatabricksHttpRequest } from '../src/lib/common/make-databricks-http-request';
import { waitForTaskCompletion } from '../src/lib/common/wait-for-task-completion';

jest.mock('../src/lib/common/make-databricks-http-request', () => ({
  makeDatabricksHttpRequest: jest.fn(),
}));

const mockedDatabricksHttpRequest = makeDatabricksHttpRequest as jest.Mock;

describe('waitForTaskCompletion', () => {
  const token = 'fake-token';
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
    mockedDatabricksHttpRequest
      .mockResolvedValueOnce({
        metadata: { state: { life_cycle_state: 'RUNNING' } },
      })
      .mockResolvedValueOnce({
        metadata: { state: { life_cycle_state: 'TERMINATED' }, result: 'done' },
      });

    const result = await waitForTaskCompletion({
      workspaceDeploymentName,
      runId,
      token,
      timeoutInSeconds: 10,
    });

    expect(result.metadata.state.life_cycle_state).toBe('TERMINATED');
    expect(mockedDatabricksHttpRequest).toHaveBeenCalledTimes(2);
  });

  it('returns immediately if job is already completed', async () => {
    mockedDatabricksHttpRequest.mockResolvedValueOnce({
      metadata: { state: { life_cycle_state: 'TERMINATED' } },
    });

    const result = await waitForTaskCompletion({
      workspaceDeploymentName,
      runId,
      token,
      timeoutInSeconds: 5,
    });

    expect(result.metadata.state.life_cycle_state).toBe('TERMINATED');
    expect(mockedDatabricksHttpRequest).toHaveBeenCalledTimes(1);
  });

  it('keeps retrying until timeout and returns last output', async () => {
    const attempts = 3;
    const timeoutInSeconds =
      ((attempts - 1) * RETRY_TIMEOUT_MILLISECONDS) / 1000;

    mockedDatabricksHttpRequest.mockResolvedValue({
      metadata: { state: { life_cycle_state: 'RUNNING' } },
    });

    const result = await waitForTaskCompletion({
      workspaceDeploymentName,
      runId,
      token,
      timeoutInSeconds,
    });

    expect(mockedDatabricksHttpRequest).toHaveBeenCalledTimes(attempts);
    expect(result.metadata.state.life_cycle_state).toBe('RUNNING');
  });
});
