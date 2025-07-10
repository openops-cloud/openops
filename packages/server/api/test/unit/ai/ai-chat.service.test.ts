const hashObjectMock = jest.fn();
const getSerializedObjectMock = jest.fn();
const setSerializedObjectMock = jest.fn();
const deleteKeyMock = jest.fn();
const acquireLockMock = jest.fn();
const releaseMock = jest.fn();
const decryptStringMock = jest.fn();
const getActiveConfigWithApiKeyMock = jest.fn();
const getAiProviderLanguageModelMock = jest.fn();

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
  encryptUtils: {
    decryptString: decryptStringMock,
  },
}));

jest.mock('@openops/common', () => ({
  getAiProviderLanguageModel: getAiProviderLanguageModelMock,
}));

jest.mock('../../../src/app/ai/config/ai-config.service', () => ({
  aiConfigService: {
    getActiveConfigWithApiKey: getActiveConfigWithApiKeyMock,
  },
}));

import { CoreMessage } from 'ai';
import {
  appendMessagesToChatHistory,
  appendMessagesToChatHistoryContext,
  deleteChatHistory,
  deleteChatHistoryContext,
  generateChatId,
  getChatContext,
  getChatHistory,
  getConversation,
  getLLMConfig,
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

describe('getChatHistory', () => {
  it('should return messages from cache if they exist', async () => {
    const chatId = 'chat-123';
    const mockMessages: CoreMessage[] = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello there!' },
    ];

    getSerializedObjectMock.mockResolvedValue(mockMessages);

    const result = await getChatHistory(chatId);

    expect(getSerializedObjectMock).toHaveBeenCalledWith(`${chatId}:history`);
    expect(result).toEqual(mockMessages);
  });

  it('should return an empty array if no messages are found', async () => {
    const chatId = 'chat-456';

    getSerializedObjectMock.mockResolvedValue(null);

    const result = await getChatHistory(chatId);

    expect(result).toEqual([]);
  });
});

describe('getChatContext', () => {
  it('should return chat context from cache if they exist', async () => {
    const chatId = 'chat-123';
    const mockMessages: CoreMessage[] = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello there!' },
    ];

    getSerializedObjectMock.mockResolvedValue(mockMessages);

    const result = await getChatContext(chatId);

    expect(getSerializedObjectMock).toHaveBeenCalledWith(`${chatId}:context`);
    expect(result).toEqual(mockMessages);
  });

  it('should return null if no context found', async () => {
    const chatId = 'chat-456';

    getSerializedObjectMock.mockResolvedValue(null);

    const result = await getChatContext(chatId);

    expect(result).toEqual(null);
  });
});

describe('appendMessagesToChatHistory', () => {
  const chatId = 'chat-append-test';
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

    await appendMessagesToChatHistory(chatId, newMessages);

    expect(acquireLockMock).toHaveBeenCalledWith({
      key: `lock:${chatId}:history`,
      timeout: 30000,
    });
    expect(getSerializedObjectMock).toHaveBeenCalledWith(`${chatId}:history`);
    expect(existingMessages.length).toBe(2);
    expect(setSerializedObjectMock).toHaveBeenCalledWith(
      `${chatId}:history`,
      [...existingMessages],
      86400,
    );
    expect(releaseMock).toHaveBeenCalled();
  });

  it('should release lock even if an error occurs', async () => {
    getSerializedObjectMock.mockRejectedValue(new Error('Test error'));

    await expect(
      appendMessagesToChatHistory(chatId, newMessages),
    ).rejects.toThrow('Test error');

    expect(releaseMock).toHaveBeenCalled();
  });
});

describe('appendMessagesToChatHistoryContext', () => {
  const chatId = 'chat-context-append-test';
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
      newMessages,
    );

    expect(acquireLockMock).toHaveBeenCalledWith({
      key: `lock:${chatId}:context:history`,
      timeout: 30000,
    });
    expect(getSerializedObjectMock).toHaveBeenCalledWith(
      `${chatId}:context:history`,
    );
    expect(setSerializedObjectMock).toHaveBeenCalledWith(
      `${chatId}:context:history`,
      [...existingMessages],
      86400,
    );
    expect(releaseMock).toHaveBeenCalled();
    expect(result).toEqual([...existingMessages]);
  });

  it('should release lock even if an error occurs', async () => {
    getSerializedObjectMock.mockRejectedValue(new Error('Test error'));

    await expect(
      appendMessagesToChatHistoryContext(chatId, newMessages),
    ).rejects.toThrow('Test error');

    expect(releaseMock).toHaveBeenCalled();
  });
});

describe('deleteChatHistoryContext', () => {
  const chatId = 'chat-context-delete-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call deleteKey for history context', async () => {
    await deleteChatHistoryContext(chatId);

    expect(deleteKeyMock).toHaveBeenCalledTimes(1);
    expect(deleteKeyMock).toHaveBeenCalledWith(`${chatId}:context:history`);
  });
});

describe('deleteChatHistory', () => {
  const chatId = 'chat-delete-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call deleteKey for history', async () => {
    await deleteChatHistory(chatId);

    expect(deleteKeyMock).toHaveBeenCalledTimes(1);
    expect(deleteKeyMock).toHaveBeenCalledWith(`${chatId}:history`);
  });
});

describe('getLLMConfig', () => {
  const projectId = 'test-project-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return aiConfig and languageModel when successful', async () => {
    const mockAiConfig = {
      id: 'config-123',
      apiKey: '{"encrypted": "api-key"}',
      model: 'gpt-4',
      provider: 'OPENAI',
      providerSettings: { temperature: 0.7 },
    };
    const mockDecryptedApiKey = 'decrypted-api-key';
    const mockLanguageModel = { id: 'model-123', type: 'LanguageModel' };

    getActiveConfigWithApiKeyMock.mockResolvedValue(mockAiConfig);
    decryptStringMock.mockReturnValue(mockDecryptedApiKey);
    getAiProviderLanguageModelMock.mockResolvedValue(mockLanguageModel);

    const result = await getLLMConfig(projectId);

    expect(getActiveConfigWithApiKeyMock).toHaveBeenCalledWith(projectId);
    expect(decryptStringMock).toHaveBeenCalledWith(
      JSON.parse(mockAiConfig.apiKey),
    );
    expect(getAiProviderLanguageModelMock).toHaveBeenCalledWith({
      apiKey: mockDecryptedApiKey,
      model: mockAiConfig.model,
      provider: mockAiConfig.provider,
      providerSettings: mockAiConfig.providerSettings,
    });
    expect(result).toEqual({
      aiConfig: mockAiConfig,
      languageModel: mockLanguageModel,
    });
  });

  it('should return error when no AI configuration is found', async () => {
    getActiveConfigWithApiKeyMock.mockResolvedValue(null);

    const result = await getLLMConfig(projectId);

    expect(getActiveConfigWithApiKeyMock).toHaveBeenCalledWith(projectId);
    expect(decryptStringMock).not.toHaveBeenCalled();
    expect(getAiProviderLanguageModelMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      error: 'No active AI configuration found for the project.',
    });
  });

  it('should return error when no AI configuration is found (undefined)', async () => {
    getActiveConfigWithApiKeyMock.mockResolvedValue(undefined);

    const result = await getLLMConfig(projectId);

    expect(getActiveConfigWithApiKeyMock).toHaveBeenCalledWith(projectId);
    expect(decryptStringMock).not.toHaveBeenCalled();
    expect(getAiProviderLanguageModelMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      error: 'No active AI configuration found for the project.',
    });
  });
});

describe('getConversation', () => {
  const chatId = 'chat-conversation-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return chatContext and messages when successful', async () => {
    const mockChatContext = {
      workflowId: 'workflow-123',
      blockName: 'block-test',
      stepName: 'step-test',
      actionName: 'action-test',
    };
    const mockMessages: CoreMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    getSerializedObjectMock.mockResolvedValueOnce(mockChatContext);
    getSerializedObjectMock.mockResolvedValueOnce(mockMessages);

    const result = await getConversation(chatId);

    expect(getSerializedObjectMock).toHaveBeenCalledWith(`${chatId}:context`);
    expect(getSerializedObjectMock).toHaveBeenCalledWith(`${chatId}:history`);
    expect(result).toEqual({
      chatContext: mockChatContext,
      messages: mockMessages,
    });
  });

  it('should return error when no chat context is found', async () => {
    getSerializedObjectMock.mockResolvedValueOnce(null);

    const result = await getConversation(chatId);

    expect(getSerializedObjectMock).toHaveBeenCalledWith(`${chatId}:context`);
    expect(getSerializedObjectMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      error: 'No chat session found for the provided chat ID.',
    });
  });

  it('should return error when chat context is undefined', async () => {
    getSerializedObjectMock.mockResolvedValueOnce(undefined);

    const result = await getConversation(chatId);

    expect(getSerializedObjectMock).toHaveBeenCalledWith(`${chatId}:context`);
    expect(getSerializedObjectMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      error: 'No chat session found for the provided chat ID.',
    });
  });

  it('should return empty messages array when no messages are found', async () => {
    const mockChatContext = {
      workflowId: 'workflow-123',
      blockName: 'block-test',
      stepName: 'step-test',
      actionName: 'action-test',
    };

    getSerializedObjectMock.mockResolvedValueOnce(mockChatContext);
    getSerializedObjectMock.mockResolvedValueOnce(null);

    const result = await getConversation(chatId);

    expect(getSerializedObjectMock).toHaveBeenCalledWith(`${chatId}:context`);
    expect(getSerializedObjectMock).toHaveBeenCalledWith(`${chatId}:history`);
    expect(result).toEqual({ chatContext: mockChatContext, messages: [] });
  });
});
