const hashObjectMock = jest.fn();
const getSerializedObjectMock = jest.fn();
const setSerializedObjectMock = jest.fn();
const deleteKeyMock = jest.fn();
const acquireLockMock = jest.fn();
const releaseMock = jest.fn();
const loggerMock = {
  debug: jest.fn(),
  error: jest.fn(),
};

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
  logger: loggerMock,
}));

// Mock crypto.randomUUID
const mockRandomUUID = jest.fn();
jest.mock('node:crypto', () => ({
  randomUUID: mockRandomUUID,
}));

import { CoreMessage } from 'ai';
import {
  ACTIVE_STREAM_SUFFIX,
  appendMessagesToChatHistory,
  appendMessagesToChatHistoryContext,
  cancelActiveStream,
  deleteActiveStream,
  deleteChatHistory,
  deleteChatHistoryContext,
  generateChatId,
  getChatContext,
  getChatHistory,
  setActiveStream,
  setupStreamCancellation,
  STREAM_EXPIRE_TIME,
  type StreamData,
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

describe('Stream Cancellation', () => {
  const chatId = 'stream-test-chat';
  const mockAbortControllerId = 'abort-controller-123';

  beforeEach(() => {
    jest.resetAllMocks();
    mockRandomUUID.mockReturnValue('mock-uuid-123');
    getSerializedObjectMock.mockResolvedValue(null);
    setSerializedObjectMock.mockResolvedValue(undefined);
    deleteKeyMock.mockResolvedValue(undefined);
  });

  describe('setActiveStream', () => {
    it('should set active stream data in cache', async () => {
      const streamData: StreamData = {
        chatId,
        abortControllerId: mockAbortControllerId,
      };

      await setActiveStream(chatId, streamData);

      expect(setSerializedObjectMock).toHaveBeenCalledWith(
        `${chatId}:${ACTIVE_STREAM_SUFFIX}`,
        streamData,
        STREAM_EXPIRE_TIME,
      );
    });
  });

  describe('deleteActiveStream', () => {
    it('should delete active stream from cache', async () => {
      await deleteActiveStream(chatId);

      expect(deleteKeyMock).toHaveBeenCalledWith(
        `${chatId}:${ACTIVE_STREAM_SUFFIX}`,
      );
    });
  });

  describe('setupStreamCancellation', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      mockRandomUUID.mockReturnValue('mock-uuid-123');
    });

    it('should create abort controller and register stream data', async () => {
      const abortController = await setupStreamCancellation(chatId);

      expect(abortController).toBeInstanceOf(AbortController);
      expect(mockRandomUUID).toHaveBeenCalled();
      expect(setSerializedObjectMock).toHaveBeenCalledWith(
        `${chatId}:${ACTIVE_STREAM_SUFFIX}`,
        expect.objectContaining({
          chatId,
          abortControllerId: `${chatId}-mock-uuid-123`,
        }),
        STREAM_EXPIRE_TIME,
      );
    });

    it('should handle existing stream and log debug message', async () => {
      const existingStreamData: StreamData = {
        chatId,
        abortControllerId: 'existing-abort',
      };

      getSerializedObjectMock.mockResolvedValue(existingStreamData);

      await setupStreamCancellation(chatId);

      expect(loggerMock.debug).toHaveBeenCalledWith(
        'Overwriting existing stream',
        {
          chatId,
        },
      );
    });

    it('should set up abort signal listener for cleanup', async () => {
      const abortController = await setupStreamCancellation(chatId);

      abortController.abort();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(deleteKeyMock).toHaveBeenCalledWith(
        `${chatId}:${ACTIVE_STREAM_SUFFIX}`,
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      deleteKeyMock.mockRejectedValue(new Error('Cleanup error'));

      const abortController = await setupStreamCancellation(chatId);

      abortController.abort();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(loggerMock.error).toHaveBeenCalledWith(
        'Failed to cleanup stream',
        {
          chatId,
          error: expect.any(Error),
        },
      );
    });
  });

  describe('cancelActiveStream', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should abort controller and cleanup when controller exists in registry', async () => {
      await setupStreamCancellation(chatId);

      const streamData: StreamData = {
        chatId,
        abortControllerId: `${chatId}-mock-uuid-123`,
      };

      getSerializedObjectMock.mockResolvedValue(streamData);

      await cancelActiveStream(chatId);

      expect(loggerMock.debug).toHaveBeenCalledWith(
        'Aborting stream controller found in this instance',
        {
          chatId,
          abortControllerId: `${chatId}-mock-uuid-123`,
        },
      );
      expect(deleteKeyMock).toHaveBeenCalledWith(
        `${chatId}:${ACTIVE_STREAM_SUFFIX}`,
      );
    });

    it('should handle case when abort controller not found in registry', async () => {
      const streamData: StreamData = {
        chatId,
        abortControllerId: 'non-existent-controller',
      };

      getSerializedObjectMock.mockResolvedValue(streamData);

      await cancelActiveStream(chatId);

      expect(loggerMock.debug).toHaveBeenCalledWith(
        'Abort controller not found in this instance, marking for cancellation',
        {
          chatId,
          abortControllerId: 'non-existent-controller',
        },
      );
      expect(deleteKeyMock).toHaveBeenCalledWith(
        `${chatId}:${ACTIVE_STREAM_SUFFIX}`,
      );
    });

    it('should handle errors during stream cancellation gracefully', async () => {
      jest.resetAllMocks();
      getSerializedObjectMock.mockRejectedValue(new Error('Cache error'));

      await expect(cancelActiveStream(chatId)).rejects.toThrow('Cache error');
    });
  });
});
