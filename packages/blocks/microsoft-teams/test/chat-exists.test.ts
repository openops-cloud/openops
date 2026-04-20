import { getMicrosoftGraphClient } from '@openops/common';
import { chatExists } from '../src/lib/common/chat-exists';

jest.mock('@openops/common');

const mockAccessToken = 'mock-access-token';

const mockGraphClient = {
  api: jest.fn(),
};

describe('chatExists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getMicrosoftGraphClient as jest.Mock).mockReturnValue(mockGraphClient);
  });

  test('should return true if chat exists', async () => {
    const mockGet = jest.fn().mockResolvedValue({ id: 'chat-123' });
    mockGraphClient.api.mockReturnValue({ get: mockGet });

    const result = await chatExists(mockAccessToken, 'chat-123');

    expect(result).toBe(true);
    expect(mockGraphClient.api).toHaveBeenCalledWith('/chats/chat-123');
    expect(mockGet).toHaveBeenCalled();
  });

  test('should return false on any error', async () => {
    const mockGet = jest.fn().mockRejectedValue(new Error('Not found'));
    mockGraphClient.api.mockReturnValue({ get: mockGet });

    const result = await chatExists(mockAccessToken, 'non-existent-chat');

    expect(result).toBe(false);
    expect(mockGraphClient.api).toHaveBeenCalledWith(
      '/chats/non-existent-chat',
    );
    expect(mockGet).toHaveBeenCalled();
  });
});
