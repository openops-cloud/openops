import { PropertyContext } from '@openops/blocks-framework';
import { getDatabricksToken } from '../src/lib/common/get-databricks-token';
import { makeDatabricksHttpRequest } from '../src/lib/common/make-databricks-http-request';
import { warehouseId } from '../src/lib/common/warehouse-id';

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

describe('warehouseId.options', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return disabled options if workspaceDeploymentName is not provided', async () => {
    const result = await warehouseId.options(
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

  it('should return dropdown options when warehouses are fetched successfully', async () => {
    mockedGetToken.mockResolvedValue('mock-token');

    mockedDatabricksHttpRequest.mockResolvedValue({
      warehouses: [
        { id: 'wh-1', name: 'Warehouse One' },
        { id: 'wh-2', name: 'Warehouse Two' },
      ],
    });

    const result = await warehouseId.options(
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
      path: '/api/2.0/sql/warehouses',
      token: 'mock-token',
    });

    expect(result).toEqual({
      disabled: false,
      options: [
        { label: 'Warehouse One', value: 'wh-1' },
        { label: 'Warehouse Two', value: 'wh-2' },
      ],
    });
  });

  it('should be disabled if makeHttpRequest fails', async () => {
    mockedGetToken.mockResolvedValue('mock-token');
    mockedDatabricksHttpRequest.mockRejectedValue(new Error('Error'));

    const result = await warehouseId.options(
      {
        auth,
        workspaceDeploymentName: 'my-workspace',
      },
      {} as PropertyContext,
    );
    expect(result).toEqual({
      disabled: true,
      placeholder: 'An error occurred while fetching warehouses',
      error: 'Error',
      options: [],
    });
  });
});
