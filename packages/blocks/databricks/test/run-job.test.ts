import { makeHttpRequest } from '@openops/common';
import { runJob } from '../src/lib/actions/run-job';
import { getDatabricksToken } from '../src/lib/common/get-databricks-token';
import { waitForTaskCompletion } from '../src/lib/common/wait-for-task-completion';

jest.mock('@openops/common', () => ({
  makeHttpRequest: jest.fn(),
}));

jest.mock('../src/lib/common/get-databricks-token', () => ({
  getDatabricksToken: jest.fn(),
}));

jest.mock('../src/lib/common/wait-for-task-completion', () => ({
  waitForTaskCompletion: jest.fn(),
}));

const mockMakeHttpRequest = makeHttpRequest as jest.Mock;
const mockGetDatabricksToken = getDatabricksToken as jest.Mock;
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
    mockGetDatabricksToken.mockResolvedValue(fakeToken);
  });

  it('triggers a job, waits for task completion, and returns outputs', async () => {
    mockMakeHttpRequest
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

    expect(mockGetDatabricksToken).toHaveBeenCalledWith(auth);

    expect(mockMakeHttpRequest).toHaveBeenNthCalledWith(
      1,
      'POST',
      expect.stringContaining('/jobs/run-now'),
      expect.anything(),
      {
        job_id: propsValue.jobId,
        notebook_params: propsValue.parameters,
      },
    );

    expect(mockMakeHttpRequest).toHaveBeenNthCalledWith(
      2,
      'GET',
      expect.stringContaining('/jobs/runs/get?'),
      expect.anything(),
    );

    expect(mockWaitForTaskCompletion).toHaveBeenCalledWith({
      workspaceDeploymentName: fakeWorkspace,
      runId: 2001,
      headers: expect.anything(),
      timeoutInSeconds: propsValue.timeout,
    });

    expect(result).toEqual({
      run_id: fakeRunId,
      outputs: [{ task: 'firstTask', output: { success: true } }],
    });
  });

  it('returns error for task if waitForTaskCompletion throws', async () => {
    mockMakeHttpRequest
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
    mockMakeHttpRequest
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
