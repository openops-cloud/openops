const hashObjectMock = jest.fn();
const getSerializedObjectMock = jest.fn();
const setSerializedObjectMock = jest.fn();
const deleteKeyMock = jest.fn();
const acquireLockMock = jest.fn();
const releaseMock = jest.fn();

jest.mock('@openops/server-shared', () => ({
  hashUtils: {
    hashObject: hashObjectMock,
  },
  cacheWrapper: {
    getSerializedObject: getSerializedObjectMock,
    setSerializedObject: setSerializedObjectMock,
    deleteKey: deleteKeyMock,
  },
  distributedLock: {
    acquireLock: acquireLockMock,
  },
}));

import { CoreMessage } from 'ai';
import {
  appendMessagesToChatHistory,
  appendMessagesToChatHistoryContext,
  createChatContext,
  deleteChatHistory,
  deleteChatHistoryContext,
  generateChatId,
  generateChatIdForMCP,
  getChatContext,
  getChatHistory,
  getChatHistoryContext,
  saveChatHistory,
  saveChatHistoryContext,
} from '../../../src/app/ai/chat/ai-chat.service';

describe('generateChatId', () => {
  it('should hash the correct object', () => {
    const params = {
      workflowId: 'workflow1',
      blockName: 'blockA',
      stepName: 'stepX',
      userId: 'user123',
      actionName: 'actionA',
    };

    const expectedHash = 'fakeHash123';
    hashObjectMock.mockReturnValue(expectedHash);

    const result = generateChatId(params);

    expect(hashObjectMock).toHaveBeenCalledWith(params);
    expect(result).toBe(expectedHash);
  });
});

describe('generateChatIdForMCP', () => {
  it('should hash the correct object', () => {
    const params = {
      chatId: 'chat123',
      userId: 'user123',
    };

    const expectedHash = 'fakeMcpHash123';
    hashObjectMock.mockReturnValue(expectedHash);

    const result = generateChatIdForMCP(params);

    expect(hashObjectMock).toHaveBeenCalledWith(params);
    expect(result).toBe(expectedHash);
  });
});

describe('getChatHistory', () => {
  it('should return messages from cache if they exist', async () => {
    const chatId = 'chat-123';
    const userId = 'user-123';
    const projectId = 'project-123';
    const mockMessages: CoreMessage[] = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello there!' },
    ];

    getSerializedObjectMock.mockResolvedValue(mockMessages);

    const result = await getChatHistory(chatId, userId, projectId);

    expect(getSerializedObjectMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:history`,
    );
    expect(result).toEqual(mockMessages);
  });

  it('should return an empty array if no messages are found', async () => {
    const chatId = 'chat-456';
    const userId = 'user-456';
    const projectId = 'project-456';

    getSerializedObjectMock.mockResolvedValue(null);

    const result = await getChatHistory(chatId, userId, projectId);

    expect(result).toEqual([]);
  });
});

describe('saveChatHistory', () => {
  it('should save messages to cache', async () => {
    const chatId = 'chat-save-123';
    const userId = 'user-save-123';
    const projectId = 'project-save-123';
    const messages: CoreMessage[] = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello there!' },
    ];

    setSerializedObjectMock.mockResolvedValue(undefined);

    await saveChatHistory(chatId, userId, projectId, messages);

    expect(setSerializedObjectMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:history`,
      messages,
      86400,
    );
  });
});

describe('createChatContext', () => {
  it('should set chat context in cache', async () => {
    const chatId = 'chat-create-123';
    const userId = 'user-create-123';
    const projectId = 'project-create-123';
    const context = {
      workflowId: 'workflow-123',
      blockName: 'block-123',
      stepName: 'step-123',
      actionName: 'action-123',
    };

    setSerializedObjectMock.mockResolvedValue(undefined);

    await createChatContext(chatId, userId, projectId, context);

    expect(setSerializedObjectMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:context`,
      context,
      86400,
    );
  });

  it('should set MCP chat context in cache', async () => {
    const chatId = 'chat-create-mcp-123';
    const userId = 'user-create-mcp-123';
    const projectId = 'project-create-mcp-123';
    const mcpContext = {
      chatId: 'mcp-chat-123',
      workflowId: 'workflow-123',
      blockName: 'block-123',
      stepName: 'step-123',
      actionName: 'action-123',
      name: 'test-name',
    };

    setSerializedObjectMock.mockResolvedValue(undefined);

    await createChatContext(chatId, userId, projectId, mcpContext);

    expect(setSerializedObjectMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:context`,
      mcpContext,
      86400,
    );
  });
});

describe('getChatContext', () => {
  it('should return chat context from cache if they exist', async () => {
    const chatId = 'chat-123';
    const userId = 'user-123';
    const projectId = 'project-123';
    const mockContext = {
      workflowId: 'workflow-123',
      blockName: 'block-123',
      stepName: 'step-123',
      actionName: 'action-123',
    };

    getSerializedObjectMock.mockResolvedValue(mockContext);

    const result = await getChatContext(chatId, userId, projectId);

    expect(getSerializedObjectMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:context`,
    );
    expect(result).toEqual(mockContext);
  });

  it('should return null if no context found', async () => {
    const chatId = 'chat-456';
    const userId = 'user-456';
    const projectId = 'project-456';

    getSerializedObjectMock.mockResolvedValue(null);

    const result = await getChatContext(chatId, userId, projectId);

    expect(result).toEqual(null);
  });
});

describe('appendMessagesToChatHistory', () => {
  const chatId = 'chat-append-test';
  const userId = 'user-append-test';
  const projectId = 'project-append-test';
  const existingMessages: CoreMessage[] = [{ role: 'user', content: 'Hello' }];
  const newMessages: CoreMessage[] = [
    { role: 'assistant', content: 'Hi there!' },
  ];
  const mockLock = { release: releaseMock };

  beforeEach(() => {
    jest.clearAllMocks();
    acquireLockMock.mockResolvedValue(mockLock);
    getSerializedObjectMock.mockResolvedValue(existingMessages);
    setSerializedObjectMock.mockResolvedValue(undefined);
    releaseMock.mockResolvedValue(undefined);
  });

  it('should append messages to existing history and save', async () => {
    expect(existingMessages.length).toBe(1);

    await appendMessagesToChatHistory(chatId, userId, projectId, newMessages);

    expect(acquireLockMock).toHaveBeenCalledWith({
      key: `lock:${projectId}:${userId}:${chatId}:history`,
      timeout: 30000,
    });
    expect(getSerializedObjectMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:history`,
    );
    expect(existingMessages.length).toBe(2);
    expect(setSerializedObjectMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:history`,
      [...existingMessages],
      86400,
    );
    expect(releaseMock).toHaveBeenCalled();
  });

  it('should release lock even if an error occurs', async () => {
    getSerializedObjectMock.mockRejectedValue(new Error('Test error'));

    await expect(
      appendMessagesToChatHistory(chatId, userId, projectId, newMessages),
    ).rejects.toThrow('Test error');

    expect(releaseMock).toHaveBeenCalled();
  });
});

describe('getChatHistoryContext', () => {
  it('should return messages from cache if they exist', async () => {
    const chatId = 'chat-history-context-123';
    const userId = 'user-history-context-123';
    const projectId = 'project-history-context-123';
    const mockMessages: CoreMessage[] = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello there!' },
    ];

    getSerializedObjectMock.mockResolvedValue(mockMessages);

    const result = await getChatHistoryContext(chatId, userId, projectId);

    expect(getSerializedObjectMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:context:history`,
    );
    expect(result).toEqual(mockMessages);
  });

  it('should return an empty array if no messages are found', async () => {
    const chatId = 'chat-history-context-456';
    const userId = 'user-history-context-456';
    const projectId = 'project-history-context-456';

    getSerializedObjectMock.mockResolvedValue(null);

    const result = await getChatHistoryContext(chatId, userId, projectId);

    expect(result).toEqual([]);
  });
});

describe('saveChatHistoryContext', () => {
  it('should save messages to cache', async () => {
    const chatId = 'chat-save-context-123';
    const userId = 'user-save-context-123';
    const projectId = 'project-save-context-123';
    const messages: CoreMessage[] = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello there!' },
    ];

    setSerializedObjectMock.mockResolvedValue(undefined);

    await saveChatHistoryContext(chatId, userId, projectId, messages);

    expect(setSerializedObjectMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:context:history`,
      messages,
      86400,
    );
  });
});

describe('appendMessagesToChatHistoryContext', () => {
  const chatId = 'chat-context-append-test';
  const userId = 'user-context-append-test';
  const projectId = 'project-context-append-test';
  const existingMessages: CoreMessage[] = [{ role: 'user', content: 'Hello' }];
  const newMessages: CoreMessage[] = [
    { role: 'assistant', content: 'Hi there!' },
  ];
  const mockLock = { release: releaseMock };

  beforeEach(() => {
    jest.clearAllMocks();
    acquireLockMock.mockResolvedValue(mockLock);
    getSerializedObjectMock.mockResolvedValue(existingMessages);
    setSerializedObjectMock.mockResolvedValue(undefined);
    releaseMock.mockResolvedValue(undefined);
  });

  it('should append messages to existing history context and save', async () => {
    const result = await appendMessagesToChatHistoryContext(
      chatId,
      userId,
      projectId,
      newMessages,
    );

    expect(acquireLockMock).toHaveBeenCalledWith({
      key: `lock:${projectId}:${userId}:${chatId}:context:history`,
      timeout: 30000,
    });
    expect(getSerializedObjectMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:context:history`,
    );
    expect(setSerializedObjectMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:context:history`,
      [...existingMessages],
      86400,
    );
    expect(releaseMock).toHaveBeenCalled();
    expect(result).toEqual([...existingMessages]);
  });

  it('should release lock even if an error occurs', async () => {
    getSerializedObjectMock.mockRejectedValue(new Error('Test error'));

    await expect(
      appendMessagesToChatHistoryContext(
        chatId,
        userId,
        projectId,
        newMessages,
      ),
    ).rejects.toThrow('Test error');

    expect(releaseMock).toHaveBeenCalled();
  });
});

describe('deleteChatHistoryContext', () => {
  const chatId = 'chat-context-delete-test';
  const userId = 'user-context-delete-test';
  const projectId = 'project-context-delete-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call deleteKey for history context', async () => {
    await deleteChatHistoryContext(chatId, userId, projectId);

    expect(deleteKeyMock).toHaveBeenCalledTimes(1);
    expect(deleteKeyMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:context:history`,
    );
  });
});

describe('deleteChatHistory', () => {
  const chatId = 'chat-delete-test';
  const userId = 'user-delete-test';
  const projectId = 'project-delete-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call deleteKey for history', async () => {
    await deleteChatHistory(chatId, userId, projectId);

    expect(deleteKeyMock).toHaveBeenCalledTimes(1);
    expect(deleteKeyMock).toHaveBeenCalledWith(
      `${projectId}:${userId}:${chatId}:history`,
    );
  });
});
