import { jwtDecode } from 'jwt-decode';
import { sendTernaryRequest } from '../../src/lib/common/send-ternary-request';

jest.mock('@openops/blocks-common', () => {
  return {
    httpClient: {
      sendRequest: jest.fn(),
    },
    HttpMethod: {
      GET: 'GET',
      POST: 'POST',
      PATCH: 'PATCH',
    },
    AuthenticationType: {
      BEARER_TOKEN: 'BEARER_TOKEN',
    },
  };
});

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}));

import { httpClient, HttpMethod } from '@openops/blocks-common';

describe('sendTernaryRequest', () => {
  const mockAuth = {
    apiKey: 'valid-jwt-token',
    tenantId: 'test-tenant-id',
    apiURL: 'https://api.test.com',
  };

  const mockResponse = {
    body: { data: 'test-data' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (jwtDecode as jest.Mock).mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    (httpClient.sendRequest as jest.Mock).mockResolvedValue(mockResponse);
  });

  test.each([
    [
      {
        auth: mockAuth,
        url: 'test-endpoint',
        method: HttpMethod.GET,
      },
    ],
    [
      {
        auth: mockAuth,
        url: 'test-endpoint',
        method: HttpMethod.POST,
        body: {
          test: 'test',
        },
      },
    ],
    [
      {
        auth: mockAuth,
        url: 'test-endpoint',
        method: HttpMethod.PATCH,
        body: {
          test: 'test',
        },
      },
    ],
  ])(
    'should call httpClient.sendRequest with correct parameters',
    async (mockRequest: any) => {
      const result = await sendTernaryRequest(mockRequest);

      expect(httpClient.sendRequest).toHaveBeenCalledWith({
        ...mockRequest,
        url: `${mockAuth.apiURL}/api/${mockRequest.url}`,
        authentication: {
          type: 'BEARER_TOKEN',
          token: mockAuth.apiKey,
        },
      });

      expect(result).toEqual(mockResponse);
    },
  );

  it('should throw an error if JWT is invalid', async () => {
    (jwtDecode as jest.Mock).mockReturnValue({
      exp: Math.floor(Date.now() / 1000) - 3600,
    });

    await expect(
      sendTernaryRequest({
        auth: mockAuth,
        url: 'test-endpoint',
        method: HttpMethod.GET,
      }),
    ).rejects.toThrow('Invalid JWT');

    expect(httpClient.sendRequest).not.toHaveBeenCalled();
  });
});
