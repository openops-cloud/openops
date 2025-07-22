import { HttpMethod, httpClient } from '@openops/blocks-common';
import { makeRequest } from '../../src/lib/common/make-request';

// Mock the httpClient
jest.mock('@openops/blocks-common', () => ({
  httpClient: {
    sendRequest: jest.fn(),
  },
  HttpMethod: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
  },
}));

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('makeRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAuth = {
    apiUrl: 'https://api.cloudfix.com',
    apiKey: 'test-api-key',
  };

  test('should make GET request with correct parameters', async () => {
    const mockResponse = { body: { data: 'test' }, status: 200 };
    mockHttpClient.sendRequest.mockResolvedValue(mockResponse);

    const result = await makeRequest({
      auth: mockAuth,
      endpoint: '/cloudfix/recommendations',
      method: HttpMethod.GET,
      queryParams: { pageNumber: '1' },
    });

    expect(mockHttpClient.sendRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: 'https://api.cloudfix.com/cloudfix/recommendations',
      headers: {
        Authorization: 'Basic dGVzdC1hcGkta2V5Og==',
      },
      body: undefined,
      queryParams: { pageNumber: '1' },
    });

    expect(result).toEqual({ data: 'test' });
  });

  test('should make POST request with body', async () => {
    const mockResponse = { body: { success: true }, status: 200 };
    mockHttpClient.sendRequest.mockResolvedValue(mockResponse);

    const body = { recommendationIds: ['test-id'] };
    const result = await makeRequest({
      auth: mockAuth,
      endpoint: '/cloudfix/create-change-requests',
      method: HttpMethod.POST,
      body,
    });

    expect(mockHttpClient.sendRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://api.cloudfix.com/cloudfix/create-change-requests',
      headers: {
        Authorization: 'Basic dGVzdC1hcGkta2V5Og==',
      },
      body,
      queryParams: undefined,
    });

    expect(result).toEqual({ success: true });
  });

  test('should encode API key correctly', async () => {
    const mockResponse = { body: {}, status: 200 };
    mockHttpClient.sendRequest.mockResolvedValue(mockResponse);

    await makeRequest({
      auth: mockAuth,
      endpoint: '/test',
      method: HttpMethod.GET,
    });

    expect(mockHttpClient.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          Authorization: 'Basic dGVzdC1hcGkta2V5Og==',
        },
      }),
    );
  });

  test('should handle different API URLs', async () => {
    const mockResponse = { body: {}, status: 200 };
    mockHttpClient.sendRequest.mockResolvedValue(mockResponse);

    const customAuth = {
      apiUrl: 'https://custom.cloudfix.com',
      apiKey: 'custom-key',
    };

    await makeRequest({
      auth: customAuth,
      endpoint: '/test',
      method: HttpMethod.GET,
    });

    expect(mockHttpClient.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://custom.cloudfix.com/test',
      }),
    );
  });
});
