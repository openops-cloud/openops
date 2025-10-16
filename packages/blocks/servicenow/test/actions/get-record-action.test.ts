import { httpClient, HttpMethod } from '@openops/blocks-common';
import { getRecordAction } from '../../src/actions/get-record-action';

jest.mock('@openops/blocks-common', () => ({
  httpClient: {
    sendRequest: jest.fn(),
  },
  HttpMethod: {
    GET: 'GET',
  },
}));

describe('get_record action', () => {
  const mockAuth = {
    username: 'testuser',
    password: 'testpass',
    instanceName: 'dev12345',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should get a record by sys_id', async () => {
    const mockResponse = {
      body: {
        result: {
          sys_id: 'abc123',
          short_description: 'Test task',
          state: '1',
        },
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'task',
        sysId: 'abc123',
      },
    };

    const result = await getRecordAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledWith({
      method: HttpMethod.GET,
      url: 'https://dev12345.service-now.com/api/now/table/task/abc123',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        Accept: 'application/json',
      },
      queryParams: {},
    });

    expect(result).toEqual(mockResponse.body);
  });

  test('should get a record with specific fields', async () => {
    const mockResponse = {
      body: {
        result: {
          sys_id: 'abc123',
          short_description: 'Test task',
        },
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'task',
        sysId: 'abc123',
        fields: ['sys_id', 'short_description'],
      },
    };

    const result = await getRecordAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledWith({
      method: HttpMethod.GET,
      url: 'https://dev12345.service-now.com/api/now/table/task/abc123',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        Accept: 'application/json',
      },
      queryParams: {
        sysparm_fields: 'sys_id,short_description',
      },
    });

    expect(result).toEqual(mockResponse.body);
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

    await expect(getRecordAction.run(context as any)).rejects.toThrow(
      'API Error',
    );
  });
});
