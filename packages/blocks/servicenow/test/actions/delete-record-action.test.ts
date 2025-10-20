import { httpClient, HttpMethod } from '@openops/blocks-common';
import { deleteRecordAction } from '../../src/actions/delete-record-action';

jest.mock('@openops/blocks-common', () => ({
  httpClient: {
    sendRequest: jest.fn(),
  },
  HttpMethod: {
    DELETE: 'DELETE',
  },
}));

describe('delete_record action', () => {
  const mockAuth = {
    username: 'testuser',
    password: 'testpass',
    instanceName: 'dev12345',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should delete a record successfully', async () => {
    const mockResponse = {
      body: {},
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'task',
        sysId: 'abc123',
      },
    };

    const result = await deleteRecordAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledWith({
      method: HttpMethod.DELETE,
      url: 'https://dev12345.service-now.com/api/now/table/task/abc123',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        Accept: 'application/json',
      },
    });

    expect(result).toEqual({
      success: true,
      message: 'The record with id "abc123" was deleted',
    });
  });

  test('should handle API errors', async () => {
    (httpClient.sendRequest as jest.Mock).mockRejectedValue(
      new Error('API Error'),
    );

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'incident',
        sysId: 'xyz789',
      },
    };

    await expect(deleteRecordAction.run(context as any)).rejects.toThrow(
      'API Error',
    );
  });
});
