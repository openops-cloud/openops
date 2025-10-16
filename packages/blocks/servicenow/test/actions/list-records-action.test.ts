import { httpClient, HttpMethod } from '@openops/blocks-common';
import { FilterType, ViewFilterTypesEnum } from '@openops/common';
import { listRecordsAction } from '../../src/actions/list-records-action';

jest.mock('@openops/blocks-common', () => ({
  httpClient: {
    sendRequest: jest.fn(),
  },
  HttpMethod: {
    GET: 'GET',
  },
}));

describe('list_records action', () => {
  const mockAuth = {
    username: 'testuser',
    password: 'testpass',
    instanceName: 'dev12345',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should list records with filters', async () => {
    const mockResponse = {
      body: {
        result: [
          { sys_id: 'abc123', short_description: 'Task 1', active: true },
          { sys_id: 'def456', short_description: 'Task 2', active: true },
        ],
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'task',
        filterType: FilterType.AND,
        filters: {
          filters: [
            {
              fieldName: 'active',
              filterType: ViewFilterTypesEnum.equal,
              value: { value: 'true' },
            },
            {
              fieldName: 'priority',
              filterType: ViewFilterTypesEnum.lower_than,
              value: { value: '3' },
            },
          ],
        },
        limit: 50,
        offset: 0,
        fields: ['sys_id', 'short_description'],
      },
    };

    const result = await listRecordsAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledWith({
      method: HttpMethod.GET,
      url: 'https://dev12345.service-now.com/api/now/table/task',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        Accept: 'application/json',
      },
      queryParams: {
        sysparm_query: 'active=true^priority<3',
        sysparm_limit: '50',
        sysparm_fields: 'sys_id,short_description',
      },
    });

    expect(result).toEqual(mockResponse.body);
  });

  test('should list records without filters', async () => {
    const mockResponse = {
      body: {
        result: [{ sys_id: 'abc123' }],
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'incident',
        filterType: FilterType.AND,
        filters: {
          filters: [],
        },
        limit: 100,
        offset: 0,
      },
    };

    const result = await listRecordsAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledWith({
      method: HttpMethod.GET,
      url: 'https://dev12345.service-now.com/api/now/table/incident',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        Accept: 'application/json',
      },
      queryParams: {
        sysparm_limit: '100',
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
        filterType: FilterType.AND,
        filters: {
          filters: [],
        },
        limit: 100,
        offset: 0,
      },
    };

    await expect(listRecordsAction.run(context as any)).rejects.toThrow(
      'API Error',
    );
  });

  test('should handle OR filter type', async () => {
    const mockResponse = {
      body: {
        result: [
          { sys_id: 'abc123', priority: 1 },
          { sys_id: 'def456', priority: 2 },
        ],
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'incident',
        filterType: FilterType.OR,
        filters: {
          filters: [
            {
              fieldName: 'priority',
              filterType: ViewFilterTypesEnum.equal,
              value: { value: '1' },
            },
            {
              fieldName: 'priority',
              filterType: ViewFilterTypesEnum.equal,
              value: { value: '2' },
            },
          ],
        },
        limit: 100,
        offset: 0,
      },
    };

    await listRecordsAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: expect.objectContaining({
          sysparm_query: 'priority=1^ORpriority=2',
        }),
      }),
    );
  });

  test('should handle empty filter type', async () => {
    const mockResponse = {
      body: {
        result: [],
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'incident',
        filterType: FilterType.AND,
        filters: {
          filters: [
            {
              fieldName: 'comments',
              filterType: ViewFilterTypesEnum.empty,
              value: { value: '' },
            },
          ],
        },
        limit: 100,
        offset: 0,
      },
    };

    await listRecordsAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: expect.objectContaining({
          sysparm_query: 'commentsISEMPTY',
        }),
      }),
    );
  });

  test('should handle contains filter type', async () => {
    const mockResponse = {
      body: {
        result: [],
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const context = {
      auth: mockAuth,
      propsValue: {
        tableName: 'incident',
        filterType: FilterType.AND,
        filters: {
          filters: [
            {
              fieldName: 'short_description',
              filterType: ViewFilterTypesEnum.contains,
              value: { value: 'network' },
            },
          ],
        },
        limit: 100,
        offset: 0,
      },
    };

    await listRecordsAction.run(context as any);

    expect(httpClient.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: expect.objectContaining({
          sysparm_query: 'short_descriptionLIKEnetwork',
        }),
      }),
    );
  });
});
