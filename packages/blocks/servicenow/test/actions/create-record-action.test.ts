import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createRecordAction } from '../../src/actions/create-record-action';

jest.mock('@openops/blocks-common', () => ({
  httpClient: {
    sendRequest: jest.fn(),
  },
  HttpMethod: {
    POST: 'POST',
  },
}));

describe('create_record action', () => {
  const mockAuth = {
    username: 'testuser',
    password: 'testpass',
    instanceName: 'dev12345',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create a record successfully', async () => {
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
        fieldsProperties: {
          fieldsProperties: [
            {
              fieldName: 'short_description',
              fieldValue: {
                fieldValue: 'Test task',
              },
            },
            {
              fieldName: 'state',
              fieldValue: {
                fieldValue: '1',
              },
            },
          ],
        },
      },
    };

    const result = await createRecordAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledWith({
      method: HttpMethod.POST,
      url: 'https://dev12345.service-now.com/api/now/table/task',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        short_description: 'Test task',
        state: '1',
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
        fieldsProperties: {
          fieldsProperties: [
            {
              fieldName: 'short_description',
              fieldValue: {
                fieldValue: 'Test incident',
              },
            },
          ],
        },
      },
    };

    await expect(createRecordAction.run(context as any)).rejects.toThrow(
      'API Error',
    );
  });
});
