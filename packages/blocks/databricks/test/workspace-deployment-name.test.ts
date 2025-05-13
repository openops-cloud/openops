import { PropertyContext } from '@openops/blocks-framework';
import { getDatabricksToken } from '../src/lib/common/get-databricks-token';
import { makeDatabricksHttpRequest } from '../src/lib/common/make-databricks-http-request';
import { workspaceDeploymentName } from '../src/lib/common/workspace-deployment-name';

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

describe('workspaceDeploymentName.options', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return disabled options if auth is not provided', async () => {
    const result = await workspaceDeploymentName.options(
      { auth: undefined },
      {} as PropertyContext,
    );

    expect(result).toEqual({
      disabled: true,
      placeholder: 'Please select a connection',
      options: [],
    });
  });

  it('should return dropdown options when workspaces are fetched successfully', async () => {
    mockedGetToken.mockResolvedValue('mock-token');

    mockedDatabricksHttpRequest.mockResolvedValue([
      {
        workspace_name: 'Workspace One',
        deployment_name: 'workspace-1',
      },
      {
        workspace_name: 'Workspace Two',
        deployment_name: 'workspace-2',
      },
    ]);

    const result = await workspaceDeploymentName.options(
      { auth },
      {} as PropertyContext,
    );

    expect(mockedGetToken).toHaveBeenCalledWith(auth);

    expect(mockedDatabricksHttpRequest).toHaveBeenCalledWith({
      deploymentName: 'accounts',
      method: 'GET',
      path: '/api/2.0/accounts/test-account-id/workspaces',
      token: 'mock-token',
    });

    expect(result).toEqual({
      disabled: false,
      options: [
        { label: 'Workspace One', value: 'workspace-1' },
        { label: 'Workspace Two', value: 'workspace-2' },
      ],
    });
  });

  it('Should return error and placeholder if makeHttpRequest fails', async () => {
    mockedGetToken.mockResolvedValue('mock-token');
    mockedDatabricksHttpRequest.mockRejectedValue(new Error('Error'));

    const result = await workspaceDeploymentName.options(
      { auth },
      {} as PropertyContext,
    );

    expect(result).toEqual({
      disabled: true,
      placeholder: 'An error occurred while fetching workspaces',
      error: 'Error',
      options: [],
    });
  });
});
