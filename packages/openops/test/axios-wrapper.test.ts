import axios from 'axios';
import { makeHttpRequest } from '../src/lib/axios-wrapper';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('makeHttpRequest', () => {
  const mockStandardRequest = jest.fn();
  const mockRetryRequest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (axios.create as jest.Mock).mockReturnValue({
      request: mockRetryRequest,
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    });

    mockedAxios.request.mockImplementation(mockStandardRequest);
  });

  it('makes a standard request without retry config', async () => {
    const responseData = { message: 'standard success' };
    mockStandardRequest.mockResolvedValueOnce({ data: responseData });

    const result = await makeHttpRequest('GET', 'https://example.com');

    expect(mockStandardRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: 'https://example.com',
      headers: undefined,
      data: undefined,
    });

    expect(result).toEqual(responseData);
  });

  it('makes a retry request with retry config', async () => {
    const responseData = { message: 'retry success' };
    mockRetryRequest.mockResolvedValueOnce({ data: responseData });

    const result = await makeHttpRequest(
      'GET',
      'https://example.com/retry',
      undefined,
      undefined,
      { retries: 3 },
    );

    expect(mockRetryRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: 'https://example.com/retry',
      headers: undefined,
      data: undefined,
    });

    expect(result).toEqual(responseData);
  });

  it('throws and logs error on failed request', async () => {
    const mockError = {
      isAxiosError: true,
      response: {
        data: { error: 'Something went wrong' },
        status: 500,
        statusText: 'Internal Server Error',
      },
    };

    mockStandardRequest.mockRejectedValueOnce(mockError as any);

    await expect(
      makeHttpRequest('GET', 'https://example.com/fail'),
    ).rejects.toThrow(JSON.stringify(mockError.response.data));
  });
});
