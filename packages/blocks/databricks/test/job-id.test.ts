import { PropertyContext } from '@openops/blocks-framework';
import { makeHttpRequest } from '@openops/common';
import { getDatabricksToken } from '../src/lib/common/get-databricks-token';
import { jobId } from '../src/lib/common/job-id';

jest.mock('@openops/common', () => ({
  makeHttpRequest: jest.fn(),
}));

jest.mock('../src/lib/common/get-databricks-token', () => ({
  getDatabricksToken: jest.fn(),
}));

const mockedGetToken = getDatabricksToken as jest.Mock;
const mockedHttpRequest = makeHttpRequest as jest.Mock;

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

    mockedHttpRequest.mockResolvedValue({
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
    expect(mockedHttpRequest).toHaveBeenCalledWith(
      'GET',
      'https://my-workspace.cloud.databricks.com/api/2.2/jobs/list',
      expect.anything(),
    );

    expect(result).toEqual({
      disabled: false,
      options: [
        { label: 'Job One', value: 'job-1' },
        { label: 'Job Two', value: 'job-2' },
      ],
    });
  });

  it('should be disabled if makeHttpRequest fails', async () => {
    mockedGetToken.mockResolvedValue('mock-token');
    mockedHttpRequest.mockRejectedValue(new Error('Request failed'));

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
