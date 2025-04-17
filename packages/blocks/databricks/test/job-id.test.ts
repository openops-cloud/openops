import { PropertyContext } from '@openops/blocks-framework';
import { getDatabricksToken } from '../src/lib/common/get-databricks-token';
import { jobId } from '../src/lib/common/job-id';
import { makeDatabricksHttpRequest } from '../src/lib/common/make-databricks-http-request';

jest.mock('../src/lib/common/make-databricks-http-request', () => ({
  makeDatabricksHttpRequest: jest.fn(),
}));

jest.mock('../src/lib/common/get-databricks-token', () => ({
  getDatabricksToken: jest.fn().mockResolvedValue('fake-token'),
}));

const mockedDatabricksHttpRequest = makeDatabricksHttpRequest as jest.Mock;
const mockedGetToken = getDatabricksToken as jest.Mock;

const auth = {
  accountId: 'test-account-id',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
};

describe('jobId.options', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return disabled options if workspaceDeploymentName is not provided', async () => {
    const result = await jobId.options(
      {
        auth,
        workspaceDeploymentName: undefined,
      },
      {} as PropertyContext,
    );

    expect(result).toEqual({
      disabled: true,
      placeholder: 'Please select a workspace',
      options: [],
    });
  });

  it('should return dropdown options when jobs are fetched successfully', async () => {
    mockedGetToken.mockResolvedValue('mock-token');

    mockedDatabricksHttpRequest.mockResolvedValue({
      jobs: [
        { job_id: 'job-1', settings: { name: 'Job One' } },
        { job_id: 'job-2', settings: { name: 'Job Two' } },
      ],
    });

    const result = await jobId.options(
      {
        auth,
        workspaceDeploymentName: 'my-workspace',
      },
      {} as PropertyContext,
    );

    expect(mockedGetToken).toHaveBeenCalledWith(auth);
    expect(mockedDatabricksHttpRequest).toHaveBeenCalledWith({
      deploymentName: 'my-workspace',
      method: 'GET',
      path: '/api/2.2/jobs/list',
      token: 'mock-token',
    });

    expect(result).toEqual({
      disabled: false,
      options: [
        { label: 'Job One', value: 'job-1' },
        { label: 'Job Two', value: 'job-2' },
      ],
    });
  });

  it('should be disabled if makeDatabricksHttpRequest fails', async () => {
    mockedGetToken.mockResolvedValue('mock-token');
    mockedDatabricksHttpRequest.mockRejectedValue(new Error('Request failed'));

    const result = await jobId.options(
      {
        auth,
        workspaceDeploymentName: 'my-workspace',
      },
      {} as PropertyContext,
    );

    expect(result).toEqual({
      disabled: true,
      placeholder: 'An error occurred while fetching jobs',
      error: 'Request failed',
      options: [],
    });
  });
});
