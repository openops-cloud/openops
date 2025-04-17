import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';
import { makeDatabricksHttpRequest } from '../src/lib/common/make-databricks-http-request';

jest.mock('@openops/common', () => ({
  makeHttpRequest: jest.fn(),
}));

const mockedMakeHttpRequest = makeHttpRequest as jest.Mock;

const mockDeploymentName = 'test-deployment';
const mockToken = 'test-token';
const mockPath = '/api/2.0/test';
const mockQueryParams = { key1: 'value1', key2: 'value2' };
const mockBody = { param1: 'value1', param2: 'value2' };
const mockResponse = { data: 'mocked response' };

describe('makeDatabricksHttpRequest', () => {
  beforeEach(() => {
    mockedMakeHttpRequest.mockReset();
  });

  test('should construct the correct GET request URL with no query parameters', async () => {
    mockedMakeHttpRequest.mockResolvedValue(mockResponse);

    await makeDatabricksHttpRequest({
      deploymentName: mockDeploymentName,
      token: mockToken,
      method: 'GET',
      path: mockPath,
    });

    const expectedUrl = `https://${mockDeploymentName}.cloud.databricks.com${mockPath}`;

    expect(makeHttpRequest).toHaveBeenCalledWith(
      'GET',
      expectedUrl,
      expect.any(AxiosHeaders),
      undefined,
    );

    const headers = (makeHttpRequest as jest.Mock).mock.calls[0][2];
    expect(headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  test('should construct the correct GET request URL with query parameters', async () => {
    mockedMakeHttpRequest.mockResolvedValue(mockResponse);

    await makeDatabricksHttpRequest({
      deploymentName: mockDeploymentName,
      token: mockToken,
      method: 'GET',
      path: mockPath,
      queryParams: mockQueryParams,
    });

    const expectedUrl = `https://${mockDeploymentName}.cloud.databricks.com${mockPath}?key1=value1&key2=value2`;

    expect(makeHttpRequest).toHaveBeenCalledWith(
      'GET',
      expectedUrl,
      expect.any(AxiosHeaders),
      undefined,
    );
  });

  test('should include body in POST request', async () => {
    mockedMakeHttpRequest.mockResolvedValue(mockResponse);

    await makeDatabricksHttpRequest({
      deploymentName: mockDeploymentName,
      token: mockToken,
      method: 'POST',
      path: mockPath,
      body: mockBody,
    });

    const expectedUrl = `https://${mockDeploymentName}.cloud.databricks.com${mockPath}`;

    expect(makeHttpRequest).toHaveBeenCalledWith(
      'POST',
      expectedUrl,
      expect.any(AxiosHeaders),
      mockBody,
    );
  });

  test('should throw error if makeHttpRequest fails', async () => {
    const mockError = new Error('Network Error');
    mockedMakeHttpRequest.mockRejectedValue(mockError);

    await expect(
      makeDatabricksHttpRequest({
        deploymentName: mockDeploymentName,
        token: mockToken,
        method: 'GET',
        path: mockPath,
      }),
    ).rejects.toThrow('Network Error');
  });

  test('should set the correct Authorization header', async () => {
    mockedMakeHttpRequest.mockResolvedValue(mockResponse);

    await makeDatabricksHttpRequest({
      deploymentName: mockDeploymentName,
      token: mockToken,
      method: 'GET',
      path: mockPath,
    });

    const headers = (mockedMakeHttpRequest as jest.Mock).mock.calls[0][2];
    expect(headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
  });

  test('should handle query parameters that are empty', async () => {
    mockedMakeHttpRequest.mockResolvedValue(mockResponse);

    await makeDatabricksHttpRequest({
      deploymentName: mockDeploymentName,
      token: mockToken,
      method: 'GET',
      path: mockPath,
      queryParams: {},
    });

    const expectedUrl = `https://${mockDeploymentName}.cloud.databricks.com${mockPath}`;
    expect(makeHttpRequest).toHaveBeenCalledWith(
      'GET',
      expectedUrl,
      expect.any(AxiosHeaders),
      undefined,
    );
  });

  test('should call makeHttpRequest with proper headers and token', async () => {
    mockedMakeHttpRequest.mockResolvedValue(mockResponse);

    await makeDatabricksHttpRequest({
      deploymentName: mockDeploymentName,
      token: mockToken,
      method: 'GET',
      path: mockPath,
    });

    const headers = (mockedMakeHttpRequest as jest.Mock).mock.calls[0][2];
    expect(headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});
