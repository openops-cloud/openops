import { getMicrosoftGraphClient } from '@openops/common';
import { createOrGetUserChat } from '../src/lib/common/create-or-get-user-chat';

jest.mock('@openops/common');

const mockAccessToken = 'mock-access-token';

const mockGraphClient = {
  api: jest.fn(),
};

describe('createOrGetUserChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getMicrosoftGraphClient as jest.Mock).mockReturnValue(mockGraphClient);
  });

  test('should return existing chat if one exists with the target user', async () => {
    const mockGet = jest.fn();

    mockGraphClient.api.mockImplementation((endpoint: string) => {
      if (endpoint === '/me') {
        return {
          get: jest.fn().mockResolvedValue({ id: 'my-user-id' }),
        };
      }
      if (endpoint === '/me/chats') {
        return {
          filter: jest.fn().mockReturnThis(),
          expand: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            value: [
              {
                id: 'existing-chat-id',
                members: [
                  { userId: 'my-user-id' },
                  { userId: 'target-user-id' },
                ],
              },
            ],
          }),
        };
      }
      return { get: mockGet, post: jest.fn() };
    });

    const result = await createOrGetUserChat(mockAccessToken, 'target-user-id');

    expect(result).toBe('existing-chat-id');
    expect(getMicrosoftGraphClient).toHaveBeenCalledWith(mockAccessToken);
  });

  test('should create new chat if no existing chat is found', async () => {
    const mockPost = jest.fn().mockResolvedValue({ id: 'new-chat-id' });

    mockGraphClient.api.mockImplementation((endpoint: string) => {
      if (endpoint === '/me') {
        return {
          get: jest.fn().mockResolvedValue({ id: 'my-user-id' }),
        };
      }
      if (endpoint === '/me/chats') {
        return {
          filter: jest.fn().mockReturnThis(),
          expand: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ value: [] }),
        };
      }
      if (endpoint === '/chats') {
        return { post: mockPost };
      }
      return { get: jest.fn(), post: jest.fn() };
    });

    const result = await createOrGetUserChat(
      mockAccessToken,
      'new-target-user-id',
    );

    expect(result).toBe('new-chat-id');
    expect(mockPost).toHaveBeenCalledWith({
      chatType: 'oneOnOne',
      members: [
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind':
            'https://graph.microsoft.com/v1.0/users/my-user-id',
        },
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind':
            'https://graph.microsoft.com/v1.0/users/new-target-user-id',
        },
      ],
    });
  });

  test('should resolve email to user ID before creating chat', async () => {
    const mockPost = jest.fn().mockResolvedValue({ id: 'new-chat-id' });

    mockGraphClient.api.mockImplementation((endpoint: string) => {
      if (endpoint === '/me') {
        return {
          get: jest.fn().mockResolvedValue({ id: 'my-user-id' }),
        };
      }
      if (endpoint === '/users') {
        return {
          filter: jest.fn().mockReturnThis(),
          get: jest
            .fn()
            .mockResolvedValue({ value: [{ id: 'resolved-user-id' }] }),
        };
      }
      if (endpoint === '/me/chats') {
        return {
          filter: jest.fn().mockReturnThis(),
          expand: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ value: [] }),
        };
      }
      if (endpoint === '/chats') {
        return { post: mockPost };
      }
      return { get: jest.fn(), post: jest.fn() };
    });

    const result = await createOrGetUserChat(
      mockAccessToken,
      'user@example.com',
    );

    expect(result).toBe('new-chat-id');
    expect(mockPost).toHaveBeenCalled();
  });

  test('should throw error if user email cannot be resolved', async () => {
    mockGraphClient.api.mockImplementation((endpoint: string) => {
      if (endpoint === '/me') {
        return {
          get: jest.fn().mockResolvedValue({ id: 'my-user-id' }),
        };
      }
      if (endpoint === '/users') {
        return {
          filter: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ value: [] }),
        };
      }
      return { get: jest.fn(), post: jest.fn() };
    });

    await expect(
      createOrGetUserChat(mockAccessToken, 'nonexistent@example.com'),
    ).rejects.toThrow('User not found: nonexistent@example.com');
  });

  test('should return existing chat when email is resolved to existing chat user', async () => {
    mockGraphClient.api.mockImplementation((endpoint: string) => {
      if (endpoint === '/me') {
        return {
          get: jest.fn().mockResolvedValue({ id: 'my-user-id' }),
        };
      }
      if (endpoint === '/users') {
        return {
          filter: jest.fn().mockReturnThis(),
          get: jest
            .fn()
            .mockResolvedValue({ value: [{ id: 'resolved-user-id' }] }),
        };
      }
      if (endpoint === '/me/chats') {
        return {
          filter: jest.fn().mockReturnThis(),
          expand: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            value: [
              {
                id: 'existing-chat-with-resolved-user',
                members: [
                  { userId: 'my-user-id' },
                  { userId: 'resolved-user-id' },
                ],
              },
            ],
          }),
        };
      }
      return { get: jest.fn(), post: jest.fn() };
    });

    const result = await createOrGetUserChat(
      mockAccessToken,
      'existing@example.com',
    );

    expect(result).toBe('existing-chat-with-resolved-user');
  });
});
