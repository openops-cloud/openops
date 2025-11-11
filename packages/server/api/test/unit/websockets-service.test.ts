const extractPrincipalMock = jest.fn();
jest.mock('../../src/app/authentication/tokens/access-token-manager', () => ({
  accessTokenManager: {
    extractPrincipal: extractPrincipalMock,
  },
}));

import { Socket } from 'socket.io';
import { getPrincipalFromWebsocket } from '../../src/app/websockets/websockets.service';

describe('getPrincipalFromWebsocket', () => {
  let mockSocket: Socket;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = {
      request: {
        headers: {
          cookie: 'token=mockToken',
        },
      },
    } as unknown as Socket;
  });

  it('should return principal when token is valid', async () => {
    const mockPrincipal = { id: 'user123', role: 'admin' };
    extractPrincipalMock.mockResolvedValue(mockPrincipal);

    const principal = await getPrincipalFromWebsocket(mockSocket);

    expect(principal).toEqual(mockPrincipal);
    expect(extractPrincipalMock).toHaveBeenCalledWith('mockToken');
  });

  it('should throw an error if cookie is missing', async () => {
    mockSocket.request.headers.cookie = undefined;

    await expect(getPrincipalFromWebsocket(mockSocket)).rejects.toThrow(
      'Authentication cookie not provided.',
    );
  });

  it('should throw an error if token extraction fails', async () => {
    extractPrincipalMock.mockRejectedValue(new Error('Invalid token'));

    await expect(getPrincipalFromWebsocket(mockSocket)).rejects.toThrow(
      'Invalid token',
    );
  });
});
