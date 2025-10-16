import { httpClient, HttpMethod } from '@openops/blocks-common';
import { updateRecordAction } from '../../src/actions/update-record-action';

jest.mock('@openops/blocks-common', () => ({
  httpClient: {
    sendRequest: jest.fn(),
  },
  HttpMethod: {
    PATCH: 'PATCH',
  },
}));

describe('update_record action', () => {
  const mockAuth = {
    username: 'testuser',
    password: 'testpass',
    instanceName: 'dev12345',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should update a record successfully', async () => {
    const mockResponse = {
      body: {
        result: {
          sys_id: 'abc123',
          short_description: 'Updated task',
          state: '2',
        },
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'task',
        sysId: 'abc123',
        fieldsProperties: {
          fieldsProperties: [
            {
              fieldName: 'short_description',
              newFieldValue: {
                newFieldValue: 'Updated task',
              },
            },
            {
              fieldName: 'state',
              newFieldValue: {
                newFieldValue: '2',
              },
            },
          ],
        },
      },
    };

    const result = await updateRecordAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledWith({
      method: HttpMethod.PATCH,
      url: 'https://dev12345.service-now.com/api/now/table/task/abc123',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        short_description: 'Updated task',
        state: '2',
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
        fieldsProperties: {
          fieldsProperties: [
            {
              fieldName: 'priority',
              newFieldValue: {
                newFieldValue: '1',
              },
            },
          ],
        },
      },
    };

    await expect(updateRecordAction.run(context as any)).rejects.toThrow(
      'API Error',
    );
  });
});
