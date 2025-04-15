import { PropertyContext } from '@openops/blocks-framework';
import { makeHttpRequest } from '@openops/common';
import { getDatabricksToken } from '../src/lib/common/get-databricks-token';
import { warehouseId } from '../src/lib/common/warehouse-id';

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

    mockedHttpRequest.mockResolvedValue({
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

    expect(mockedHttpRequest).toHaveBeenCalledWith(
      'GET',
      'https://my-workspace.cloud.databricks.com/api/2.0/sql/warehouses',
      expect.anything(),
    );

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
    mockedHttpRequest.mockRejectedValue(new Error('Error'));

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
