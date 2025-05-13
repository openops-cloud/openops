import { runJob } from '../src/lib/actions/run-job';
import { getDatabricksToken } from '../src/lib/common/get-databricks-token';
import { makeDatabricksHttpRequest } from '../src/lib/common/make-databricks-http-request';
import { waitForTaskCompletion } from '../src/lib/common/wait-for-task-completion';

jest.mock('../src/lib/common/make-databricks-http-request', () => ({
  makeDatabricksHttpRequest: jest.fn(),
}));

jest.mock('../src/lib/common/get-databricks-token', () => ({
  getDatabricksToken: jest.fn().mockResolvedValue('fake-token'),
}));

jest.mock('../src/lib/common/wait-for-task-completion', () => ({
  waitForTaskCompletion: jest.fn(),
}));

const mockedDatabricksHttpRequest = makeDatabricksHttpRequest as jest.Mock;
const mockedGetToken = getDatabricksToken as jest.Mock;
const mockWaitForTaskCompletion = waitForTaskCompletion as jest.Mock;

const fakeToken = 'fake-token';
const fakeRunId = 1001;
const fakeWorkspace = 'demo-ws';

const auth = {
  accountId: 'test-account-id',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
};
const propsValue = {
  workspaceDeploymentName: fakeWorkspace,
  jobId: '999',
  parameters: { foo: 'bar' },
  timeout: 30,
};

describe('runJob action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetToken.mockResolvedValue(fakeToken);
  });

  it('triggers a job, waits for task completion, and returns outputs', async () => {
    mockedDatabricksHttpRequest
      .mockResolvedValueOnce({ run_id: fakeRunId, number_in_job: 1 })
      .mockResolvedValueOnce({
        tasks: [{ run_id: 2001, task_key: 'firstTask' }],
      });

    mockWaitForTaskCompletion.mockResolvedValue({ success: true });

    const result = await runJob.run({
      ...jest.requireActual('@openops/blocks-framework'),
      auth,
      propsValue,
    });

    expect(mockedGetToken).toHaveBeenCalledWith(auth);

    expect(mockedDatabricksHttpRequest).toHaveBeenCalledWith({
      body: { job_id: '999', notebook_params: { foo: 'bar' } },
      deploymentName: 'demo-ws',
      method: 'POST',
      path: '/api/2.2/jobs/run-now',
      token: 'fake-token',
    });

    expect(mockedDatabricksHttpRequest).toHaveBeenCalledWith({
      deploymentName: 'demo-ws',
      method: 'GET',
      path: '/api/2.2/jobs/runs/get',
      queryParams: { include_resolved_values: 'true', run_id: '1001' },
      token: 'fake-token',
    });

    expect(mockWaitForTaskCompletion).toHaveBeenCalledWith({
      workspaceDeploymentName: fakeWorkspace,
      runId: 2001,
      token: 'fake-token',
      timeoutInSeconds: propsValue.timeout,
    });

    expect(result).toEqual({
      run_id: fakeRunId,
      outputs: [{ task: 'firstTask', output: { success: true } }],
    });
  });

  it('returns error for task if waitForTaskCompletion throws', async () => {
    mockedDatabricksHttpRequest
      .mockResolvedValueOnce({ run_id: fakeRunId })
      .mockResolvedValueOnce({
        tasks: [{ run_id: 3001, task_key: 'failingTask' }],
      });

    mockWaitForTaskCompletion.mockRejectedValue(new Error('timeout or fail'));

    const result = await runJob.run({
      ...jest.requireActual('@openops/blocks-framework'),
      auth,
      propsValue,
    });

    expect(result).toEqual({
      run_id: fakeRunId,
      outputs: [{ task: 'failingTask', error: 'timeout or fail' }],
    });
  });

  it('handles multiple tasks correctly', async () => {
    mockedDatabricksHttpRequest
      .mockResolvedValueOnce({ run_id: fakeRunId })
      .mockResolvedValueOnce({
        tasks: [
          { run_id: 4001, task_key: 'taskA' },
          { run_id: 4002, task_key: 'taskB' },
        ],
      });

    mockWaitForTaskCompletion
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error('something failed'));

    const result = await runJob.run({
      ...jest.requireActual('@openops/blocks-framework'),
      auth,
      propsValue,
    });

    expect(result).toEqual({
      run_id: fakeRunId,
      outputs: [
        { task: 'taskA', output: { ok: true } },
        { task: 'taskB', error: 'something failed' },
      ],
    });
  });
});
