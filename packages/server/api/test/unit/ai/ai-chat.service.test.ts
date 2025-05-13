const hashObjectMock = jest.fn();
const getSerializedObjectMock = jest.fn();
const deleteKeyMock = jest.fn();
jest.mock('@openops/server-shared', () => ({
  hashUtils: {
    hashObject: hashObjectMock,
  },
  cacheWrapper: {
    getSerializedObject: getSerializedObjectMock,
    deleteKey: deleteKeyMock,
  },
}));

import { CoreMessage } from 'ai';
import {
  deleteChatHistory,
  generateChatId,
  getChatContext,
  getChatHistory,
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
