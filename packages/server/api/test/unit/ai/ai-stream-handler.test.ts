const pipeDataStreamToResponseMock = jest.fn();
const streamTextMock = jest.fn();
const loggerDebugMock = jest.fn();
const loggerWarnMock = jest.fn();
const appendMessagesToChatHistoryMock = jest.fn();
const appendMessagesToChatHistoryContextMock = jest.fn();
const summarizeChatHistoryContextMock = jest.fn().mockImplementation(() => {
  return Promise.resolve([]);
});
const generateMessageIdMock = jest.fn();
const sendAiChatFailureEventMock = jest.fn();
const getNumberOrThrowMock = jest.fn().mockReturnValue(1);
const shouldTryToSummarizeMock = jest.fn();

jest.mock('@openops/server-shared', () => ({
  logger: {
    debug: loggerDebugMock,
    warn: loggerWarnMock,
    error: jest.fn(),
  },
  system: {
    getNumberOrThrow: getNumberOrThrowMock,
  },
  AppSystemProp: {
    MAX_LLM_CALLS_WITHOUT_INTERACTION: 'MAX_LLM_CALLS_WITHOUT_INTERACTION',
  },
}));

jest.mock('ai', () => ({
  pipeDataStreamToResponse: pipeDataStreamToResponseMock,
  streamText: streamTextMock,
}));

jest.mock('../../../src/app/ai/chat/ai-chat.service', () => ({
  appendMessagesToChatHistory: appendMessagesToChatHistoryMock,
  appendMessagesToChatHistoryContext: appendMessagesToChatHistoryContextMock,
}));

jest.mock('../../../src/app/ai/chat/ai-message-history-summarizer', () => ({
  shouldTryToSummarize: shouldTryToSummarizeMock,
  summarizeChatHistoryContext: summarizeChatHistoryContextMock,
}));

jest.mock('../../../src/app/ai/chat/ai-message-id-generator', () => ({
  generateMessageId: generateMessageIdMock,
}));

jest.mock('../../../src/app/telemetry/event-models', () => ({
  sendAiChatFailureEvent: sendAiChatFailureEventMock,
}));

import { AiConfig, AiProviderEnum } from '@openops/shared';
import { CoreMessage, DataStreamWriter, LanguageModel, ToolSet } from 'ai';
import { ServerResponse } from 'http';
import {
  StreamParams,
  streamAIResponse,
} from '../../../src/app/ai/chat/ai-stream-handler';

describe('ai-stream-handler', () => {
  let mockStreamParams: StreamParams;
  let mockServerResponse: ServerResponse;
  let mockDataStreamWriter: DataStreamWriter;
  const mockLanguageModel = {} as LanguageModel;

  const mockAiConfig: AiConfig = {
    id: 'config-id',
    model: 'gpt-4',
    provider: AiProviderEnum.OPENAI,
    apiKey: 'test-api-key',
    modelSettings: {
      temperature: 0.7,
      maxTokens: 1000,
    },
    created: '',
    updated: '',
    projectId: 'project-id',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    summarizeChatHistoryContextMock.mockImplementation(() => {
      return Promise.resolve([]);
    });

    mockDataStreamWriter = {
      write: jest.fn(),
      mergeIntoDataStream: jest.fn(),
    } as unknown as DataStreamWriter;

    mockServerResponse = {
      write: jest.fn(),
      end: jest.fn(),
    } as unknown as ServerResponse;

    mockStreamParams = {
      userId: 'user-id',
      chatId: 'chat-id',
      projectId: 'project-id',
      aiConfig: mockAiConfig,
      systemPrompt: 'You are a helpful assistant',
      messages: [{ role: 'user', content: 'Hello' }] as CoreMessage[],
      languageModel: mockLanguageModel,
      serverResponse: mockServerResponse,
      mcpClients: [],
      handledError: false,
    };
  });

  it('should call pipeDataStreamToResponse with the correct parameters', () => {
    pipeDataStreamToResponseMock.mockImplementation((_, options) => {
      options.execute(mockDataStreamWriter);
    });

    streamTextMock.mockReturnValue({
      mergeIntoDataStream: jest.fn(),
    });

    streamAIResponse(mockStreamParams);

    expect(pipeDataStreamToResponseMock).toHaveBeenCalledWith(
      mockServerResponse,
      expect.objectContaining({
        execute: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
    expect(loggerDebugMock).toHaveBeenCalledWith('Send user message to LLM.');
  });

  it('should handle errors when streaming fails', () => {
    const mockError = new Error('Streaming failed');
    pipeDataStreamToResponseMock.mockImplementation((_, options) => {
      options.onError(mockError);
    });

    streamAIResponse(mockStreamParams);

    expect(pipeDataStreamToResponseMock).toHaveBeenCalled();
    expect(sendAiChatFailureEventMock).toHaveBeenCalled();
  });

  it('should call streamText with the correct parameters', () => {
    pipeDataStreamToResponseMock.mockImplementation((_, options) => {
      options.execute(mockDataStreamWriter);
    });

    const mockStreamTextResult = {
      mergeIntoDataStream: jest.fn(),
    };
    streamTextMock.mockReturnValue(mockStreamTextResult);

    streamAIResponse(mockStreamParams);

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: mockLanguageModel,
        system: expect.any(String),
        messages: mockStreamParams.messages,
        maxRetries: 1,
        maxSteps: 1,
        onStepFinish: expect.any(Function),
        onError: expect.any(Function),
        onFinish: expect.any(Function),
      }),
    );
    expect(mockStreamTextResult.mergeIntoDataStream).toHaveBeenCalledWith(
      mockDataStreamWriter,
    );
  });

  it('should handle onFinish callback correctly', async () => {
    let onFinishPromise: Promise<void> = Promise.resolve();
    appendMessagesToChatHistoryMock.mockResolvedValue(undefined);
    appendMessagesToChatHistoryContextMock.mockResolvedValue([]);

    pipeDataStreamToResponseMock.mockImplementation((_, options) => {
      options.execute(mockDataStreamWriter);
    });

    streamTextMock.mockImplementation(({ onFinish }) => {
      onFinishPromise = onFinish({
        finishReason: 'stop',
        response: {
          messages: [{ role: 'assistant', content: 'Hello there!' }],
        },
      });

      return {
        mergeIntoDataStream: jest.fn(),
      };
    });

    streamAIResponse(mockStreamParams);

    await onFinishPromise;

    expect(appendMessagesToChatHistoryMock).toHaveBeenCalledWith(
      mockStreamParams.chatId,
      [{ role: 'assistant', content: 'Hello there!' }],
    );
    expect(appendMessagesToChatHistoryContextMock).toHaveBeenCalledWith(
      mockStreamParams.chatId,
      [{ role: 'assistant', content: 'Hello there!' }],
    );
  });

  it('should handle message truncation', async () => {
    let onFinishPromise: Promise<void> = Promise.resolve();
    pipeDataStreamToResponseMock.mockImplementation((_, options) => {
      options.execute(mockDataStreamWriter);
    });

    generateMessageIdMock.mockReturnValue('message-id-123');

    streamTextMock.mockImplementation(({ onFinish }) => {
      onFinishPromise = onFinish({
        finishReason: 'length',
        response: {
          messages: [{ role: 'assistant', content: 'Truncated message' }],
        },
      });
      return {
        mergeIntoDataStream: jest.fn(),
      };
    });

    streamAIResponse(mockStreamParams);

    await onFinishPromise;

    expect(summarizeChatHistoryContextMock).toHaveBeenCalledWith(
      mockLanguageModel,
      mockAiConfig,
      mockStreamParams.chatId,
    );
    expect(mockDataStreamWriter.write).toHaveBeenCalled();
  });

  it('should handle errors during streaming', async () => {
    let onErrorPromise: Promise<void> = Promise.resolve();
    pipeDataStreamToResponseMock.mockImplementation((_, options) => {
      options.execute(mockDataStreamWriter);
    });

    const mockError = new Error('Streaming error');
    streamTextMock.mockImplementation(({ onError }) => {
      onErrorPromise = onError({ error: mockError });
      return {
        mergeIntoDataStream: jest.fn(),
      };
    });

    streamAIResponse(mockStreamParams);

    await onErrorPromise;

    expect(mockStreamParams.handledError).toBe(true);
  });

  it('should handle maximum recursion depth', async () => {
    let onStepFinishPromise: Promise<void> = Promise.resolve();
    pipeDataStreamToResponseMock.mockImplementation((_, options) => {
      options.execute(mockDataStreamWriter);
    });

    generateMessageIdMock.mockReturnValue('message-id-123');

    streamTextMock.mockImplementation(({ onStepFinish }) => {
      onStepFinishPromise = onStepFinish({ finishReason: 'tool_calls' });
      return {
        mergeIntoDataStream: jest.fn(),
      };
    });

    streamAIResponse(mockStreamParams);

    await onStepFinishPromise;

    expect(mockDataStreamWriter.write).toHaveBeenCalled();
    expect(loggerWarnMock).toHaveBeenCalledWith(
      expect.stringContaining('Maximum recursion depth'),
    );
  });

  it('should try to summarize when error contains "tokens" and attempt index is low', async () => {
    let onErrorPromise: Promise<void> = Promise.resolve();
    let secondStreamTextCalled = false;

    pipeDataStreamToResponseMock.mockImplementation((_, options) => {
      options.execute(mockDataStreamWriter);
    });

    const mockError = new Error('Too many tokens');
    shouldTryToSummarizeMock.mockReturnValue(true);
    summarizeChatHistoryContextMock.mockResolvedValue([
      { role: 'system', content: 'Summarized content' },
    ]);

    streamTextMock.mockImplementationOnce(({ onError }) => {
      onErrorPromise = onError({ error: mockError });
      return {
        mergeIntoDataStream: jest.fn(),
      };
    });

    streamTextMock.mockImplementationOnce(() => {
      secondStreamTextCalled = true;
      return {
        mergeIntoDataStream: jest.fn(),
      };
    });

    streamAIResponse(mockStreamParams);

    await onErrorPromise;

    await new Promise(process.nextTick);

    expect(shouldTryToSummarizeMock).toHaveBeenCalled();
    expect(summarizeChatHistoryContextMock).toHaveBeenCalledWith(
      mockLanguageModel,
      mockAiConfig,
      mockStreamParams.chatId,
    );
    expect(secondStreamTextCalled).toBe(true);
  });

  it('should not try to summarize when shouldTryToSummarize returns false', async () => {
    let onErrorPromise: Promise<void> = Promise.resolve();
    pipeDataStreamToResponseMock.mockImplementation((_, options) => {
      options.execute(mockDataStreamWriter);
    });

    const mockError = new Error('Different error');
    shouldTryToSummarizeMock.mockReturnValue(false);
    generateMessageIdMock.mockReturnValue('message-id-123');

    streamTextMock.mockImplementation(({ onError }) => {
      onErrorPromise = onError({ error: mockError });
      return {
        mergeIntoDataStream: jest.fn(),
      };
    });

    streamAIResponse(mockStreamParams);

    await onErrorPromise;

    expect(shouldTryToSummarizeMock).toHaveBeenCalled();
    expect(summarizeChatHistoryContextMock).not.toHaveBeenCalled();
    expect(sendAiChatFailureEventMock).toHaveBeenCalled();
  });

  it('should handle errors when summarizing chat history context', async () => {
    const mockError = new Error('Test error');
    const summarizationError = new Error('Summarization failed');
    summarizeChatHistoryContextMock.mockRejectedValueOnce(summarizationError);
    generateMessageIdMock.mockReturnValue('message-id-123');

    pipeDataStreamToResponseMock.mockImplementation((_, options) => {
      options.onError(mockError);
    });

    streamAIResponse(mockStreamParams);

    await new Promise(process.nextTick);

    expect(summarizeChatHistoryContextMock).toHaveBeenCalledWith(
      mockLanguageModel,
      mockAiConfig,
      mockStreamParams.chatId,
    );
    expect(loggerWarnMock).toHaveBeenCalledWith(
      'Failed to summarize message history.',
      summarizationError,
    );
    expect(sendAiChatFailureEventMock).toHaveBeenCalled();
  });

  it('should set toolChoice to none and update system prompt when no tools are provided', () => {
    pipeDataStreamToResponseMock.mockImplementation((_, options) => {
      options.execute(mockDataStreamWriter);
    });

    const paramsWithoutTools = {
      ...mockStreamParams,
      tools: undefined,
    };

    streamTextMock.mockReturnValue({
      mergeIntoDataStream: jest.fn(),
    });

    streamAIResponse(paramsWithoutTools);

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        toolChoice: 'none',
        system: expect.stringContaining('MCP tools are not available'),
      }),
    );
  });

  it('should set toolChoice to auto when tools are provided', () => {
    pipeDataStreamToResponseMock.mockImplementation((_, options) => {
      options.execute(mockDataStreamWriter);
    });

    const paramsWithTools = {
      ...mockStreamParams,
      tools: { someFunction: { description: 'test' } } as unknown as ToolSet,
    };

    streamTextMock.mockReturnValue({
      mergeIntoDataStream: jest.fn(),
    });

    streamAIResponse(paramsWithTools);

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        toolChoice: 'auto',
        tools: paramsWithTools.tools,
      }),
    );
  });
});
