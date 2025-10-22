import { httpClient, HttpMethod } from '@openops/blocks-common';
import { upsertRecordAction } from '../../src/actions/upsert-record-action';

jest.mock('@openops/blocks-common', () => ({
  httpClient: {
    sendRequest: jest.fn(),
  },
  HttpMethod: {
    GET: 'GET',
    POST: 'POST',
    PATCH: 'PATCH',
  },
}));

describe('upsert_record action', () => {
  const mockAuth = {
    username: 'testuser',
    password: 'testpass',
    instanceName: 'dev12345',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create a new record when sysId is not provided', async () => {
    const mockResponse = {
      body: {
        result: {
          sys_id: 'newid123',
          short_description: 'New task',
          state: '1',
        },
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'task',
        sysId: '',
        fieldsProperties: {
          fieldsProperties: [
            {
              fieldName: 'short_description',
              fieldValue: {
                fieldValue: 'New task',
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

    const result = await upsertRecordAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledTimes(1);
    expect(httpClient.sendRequest).toHaveBeenCalledWith({
      method: HttpMethod.POST,
      url: 'https://dev12345.service-now.com/api/now/table/task',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        short_description: 'New task',
        state: '1',
      },
    });

    expect(result).toEqual(mockResponse.body);
  });

  test('should create a new record when sysId is provided but record does not exist', async () => {
    const createResponse = {
      body: {
        result: {
          sys_id: 'newid456',
          short_description: 'Another task',
          state: '2',
        },
      },
    };

    (httpClient.sendRequest as jest.Mock)
      .mockRejectedValueOnce(new Error('Record not found'))
      .mockResolvedValueOnce(createResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'task',
        sysId: 'nonexistent123',
        fieldsProperties: {
          fieldsProperties: [
            {
              fieldName: 'short_description',
              fieldValue: {
                fieldValue: 'Another task',
              },
            },
            {
              fieldName: 'state',
              fieldValue: {
                fieldValue: '2',
              },
            },
          ],
        },
      },
    };

    const result = await upsertRecordAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledTimes(2);

    expect(httpClient.sendRequest).toHaveBeenNthCalledWith(1, {
      method: HttpMethod.GET,
      url: 'https://dev12345.service-now.com/api/now/table/task/nonexistent123',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        Accept: 'application/json',
      },
    });

    expect(httpClient.sendRequest).toHaveBeenNthCalledWith(2, {
      method: HttpMethod.POST,
      url: 'https://dev12345.service-now.com/api/now/table/task',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        short_description: 'Another task',
        state: '2',
      },
    });

    expect(result).toEqual(createResponse.body);
  });

  test('should update an existing record when sysId is provided and record exists', async () => {
    const getResponse = {
      body: {
        result: {
          sys_id: 'existing123',
          short_description: 'Old description',
          state: '1',
        },
      },
    };

    const updateResponse = {
      body: {
        result: {
          sys_id: 'existing123',
          short_description: 'Updated description',
          state: '2',
        },
      },
    };

    (httpClient.sendRequest as jest.Mock)
      .mockResolvedValueOnce(getResponse)
      .mockResolvedValueOnce(updateResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'task',
        sysId: 'existing123',
        fieldsProperties: {
          fieldsProperties: [
            {
              fieldName: 'short_description',
              fieldValue: {
                fieldValue: 'Updated description',
              },
            },
            {
              fieldName: 'state',
              fieldValue: {
                fieldValue: '2',
              },
            },
          ],
        },
      },
    };

    const result = await upsertRecordAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledTimes(2);

    // First call: GET to check if record exists
    expect(httpClient.sendRequest).toHaveBeenNthCalledWith(1, {
      method: HttpMethod.GET,
      url: 'https://dev12345.service-now.com/api/now/table/task/existing123',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        Accept: 'application/json',
      },
    });

    // Second call: PATCH to update
    expect(httpClient.sendRequest).toHaveBeenNthCalledWith(2, {
      method: HttpMethod.PATCH,
      url: 'https://dev12345.service-now.com/api/now/table/task/existing123',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        short_description: 'Updated description',
        state: '2',
      },
    });

    expect(result).toEqual(updateResponse.body);
  });

  test('should create a new record when sysId is only whitespace', async () => {
    const mockResponse = {
      body: {
        result: {
          sys_id: 'newid789',
          short_description: 'Whitespace test',
          state: '1',
        },
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'task',
        sysId: '   ',
        fieldsProperties: {
          fieldsProperties: [
            {
              fieldName: 'short_description',
              fieldValue: {
                fieldValue: 'Whitespace test',
              },
            },
          ],
        },
      },
    };

    const result = await upsertRecordAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledTimes(1);
    expect(httpClient.sendRequest).toHaveBeenCalledWith({
      method: HttpMethod.POST,
      url: 'https://dev12345.service-now.com/api/now/table/task',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        short_description: 'Whitespace test',
      },
    });

    expect(result).toEqual(mockResponse.body);
  });

  test('should handle API errors during creation', async () => {
    (httpClient.sendRequest as jest.Mock).mockRejectedValue(
      new Error('API Error'),
    );

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'incident',
        sysId: '',
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

    await expect(upsertRecordAction.run(context as any)).rejects.toThrow(
      'API Error',
    );
  });

  test('should handle API errors during update', async () => {
    const getResponse = {
      body: {
        result: {
          sys_id: 'existing456',
          short_description: 'Existing record',
        },
      },
    };

    (httpClient.sendRequest as jest.Mock)
      .mockResolvedValueOnce(getResponse)
      .mockRejectedValueOnce(new Error('Update failed'));

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'task',
        sysId: 'existing456',
        fieldsProperties: {
          fieldsProperties: [
            {
              fieldName: 'short_description',
              fieldValue: {
                fieldValue: 'Updated record',
              },
            },
          ],
        },
      },
    };

    await expect(upsertRecordAction.run(context as any)).rejects.toThrow(
      'Update failed',
    );
  });

  test('should handle empty fieldsProperties array', async () => {
    const mockResponse = {
      body: {
        result: {
          sys_id: 'empty123',
        },
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'task',
        sysId: '',
        fieldsProperties: {
          fieldsProperties: [],
        },
      },
    };

    const result = await upsertRecordAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledWith({
      method: HttpMethod.POST,
      url: 'https://dev12345.service-now.com/api/now/table/task',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {},
    });

    expect(result).toEqual(mockResponse.body);
  });
});
