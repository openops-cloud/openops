import { httpClient, HttpMethod } from '@openops/blocks-common';
import { getServiceNowChoiceValues } from '../../src/lib/get-choice-values';

jest.mock('@openops/blocks-common', () => ({
  httpClient: {
    sendRequest: jest.fn(),
  },
  HttpMethod: {
    GET: 'GET',
  },
}));

describe('getServiceNowChoiceValues', () => {
  const mockAuth = {
    username: 'testuser',
    password: 'testpass',
    instanceName: 'dev12345',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch choice values for a field', async () => {
    const mockResponse = {
      body: {
        result: [
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' },
          { label: 'Option C', value: 'c' },
        ],
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const choices = await getServiceNowChoiceValues(
      mockAuth,
      'incident',
      'priority',
    );

    expect(httpClient.sendRequest).toHaveBeenCalledWith({
      method: HttpMethod.GET,
      url: 'https://dev12345.service-now.com/api/now/table/sys_choice',
      headers: {
        Authorization: expect.stringContaining('Basic'),
        Accept: 'application/json',
      },
      queryParams: {
        sysparm_query:
          'name=incident^element=priority^inactive=false^language=en',
        sysparm_fields: 'label,value',
        sysparm_limit: '1000',
      },
    });

    expect(choices).toEqual([
      { label: 'Option A', value: 'a' },
      { label: 'Option B', value: 'b' },
      { label: 'Option C', value: 'c' },
    ]);
  });

  test('should handle choices without labels', async () => {
    const mockResponse = {
      body: {
        result: [
          { label: '', value: 'a' },
          { label: null, value: 'b' },
        ],
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const choices = await getServiceNowChoiceValues(
      mockAuth,
      'incident',
      'priority',
    );

    expect(choices).toEqual([
      { label: 'a', value: 'a' },
      { label: 'b', value: 'b' },
    ]);
  });

  test('should return empty array on API error', async () => {
    (httpClient.sendRequest as jest.Mock).mockRejectedValue(
      new Error('API Error'),
    );

    const choices = await getServiceNowChoiceValues(
      mockAuth,
      'incident',
      'priority',
    );

    expect(choices).toEqual([]);
  });

  test('should return empty array when no choices found', async () => {
    const mockResponse = {
      body: {
        result: [],
      },
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);

    const choices = await getServiceNowChoiceValues(
      mockAuth,
      'incident',
      'priority',
    );

    expect(choices).toEqual([]);
  });
});
