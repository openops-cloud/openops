import { PropertyContext } from '@openops/blocks-framework';
import { makeHttpRequest } from '@openops/common';
import { getDatabricksToken } from '../src/lib/common/get-databricks-token';
import { workspaceDeploymentName } from '../src/lib/common/workspace-deployment-name';

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

    mockedHttpRequest.mockResolvedValue([
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

    expect(mockedHttpRequest).toHaveBeenCalledWith(
      'GET',
      'https://accounts.cloud.databricks.com/api/2.0/accounts/test-account-id/workspaces',
      expect.anything(),
    );

    expect(result).toEqual({
      disabled: false,
      options: [
        { label: 'Workspace One', value: 'workspace-1' },
        { label: 'Workspace Two', value: 'workspace-2' },
      ],
    });
  });

  it('should throw if makeHttpRequest fails', async () => {
    mockedGetToken.mockResolvedValue('mock-token');
    mockedHttpRequest.mockRejectedValue(new Error('Request failed'));

    const result = await workspaceDeploymentName.options(
      { auth },
      {} as PropertyContext,
    );

    expect(result).toEqual({
      disabled: true,
      placeholder: 'Failed to load workspace options. Please try again.',
      options: [],
    });
  });
});
