import { logger } from '@openops/server-shared';
import { ChatFlowContext } from '@openops/shared';
import { CoreMessage } from 'ai';
import {
  sendAiChatFailureEvent,
  sendAiChatMessageSendEvent,
} from '../../telemetry/event-models';
import { getLLMConfig, saveChatHistory } from './ai-chat.service';
import { generateMessageId, generateToolId } from './ai-id-generators';
import { streamCode } from './code.service';
import { enrichContext, IncludeOptions } from './context-enrichment.service';
import { getBlockSystemPrompt } from './prompts.service';
import {
  buildDoneMessage,
  buildFinishMessage,
  buildMessageIdMessage,
  buildTextMessage,
  buildToolCallDeltaMessage,
  buildToolCallMessage,
  buildToolCallStreamingStartMessage,
  buildToolResultMessage,
} from './stream-message-builder';
import { Conversation, RequestContext } from './types';

type CodeGenerationResult = {
  type: string;
  code?: string;
  packageJson?: string;
  textAnswer: string;
};

type CodeMessageParams = RequestContext & {
  newMessage: CoreMessage;
  additionalContext?: ChatFlowContext;
  conversation: Conversation;
};

const GENERATE_CODE_TOOL_NAME = 'generate_code';
const ROLE_ASSISTANT = 'assistant';

/**
 * Processes a single line of JSON data and sends progress updates if it's a code result
 */
function processStreamLine(
  line: string,
  toolCallId: string,
  serverResponse: NodeJS.WritableStream,
): void {
  if (!line.trim()) return;

  try {
    const data = JSON.parse(line);

    if (data.type === 'code' && data.code) {
      const partialResult = {
        toolCallId,
        result: {
          code: data.code,
          packageJson: data.packageJson || '{}',
        },
      };
      serverResponse.write(`a:${JSON.stringify(partialResult)}\n`);
    }
  } catch (e) {
    logger.debug('Error parsing JSON', {
      error: e,
      line,
    });
  }
}

/**
 * Streams code generation progress in real-time to the client
 */
async function streamCodeGenerationProgress(
  stream: Response,
  serverResponse: NodeJS.WritableStream,
  toolCallId: string,
): Promise<void> {
  const reader = stream.body?.getReader();
  if (!reader) return;

  try {
    let done = false;
    let buffer = '';

    while (!done) {
      const result = await reader.read();
      done = result.done;

      if (!done && result.value) {
        const chunk = new TextDecoder().decode(result.value);
        buffer += chunk;

        // Process complete JSON objects from the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          processStreamLine(line, toolCallId, serverResponse);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Handles errors in code generation by creating an assistant message and saving to history
 */
async function handleCodeGenerationError(
  error: unknown,
  params: {
    chatId: string;
    userId: string;
    projectId: string;
    chatHistory: CoreMessage[];
    serverResponse: NodeJS.WritableStream;
    aiConfig: { provider: string; model: string };
  },
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.warn(errorMessage, error);

  params.serverResponse.write(`0:"\\n\\n"\n`);
  params.serverResponse.write(`0:${JSON.stringify(errorMessage)}\n`);

  const errorAssistantMessage: CoreMessage = {
    role: ROLE_ASSISTANT,
    content: [
      {
        type: 'text',
        text: errorMessage,
      },
    ],
  };

  await saveChatHistory(params.chatId, params.userId, params.projectId, [
    ...params.chatHistory,
    errorAssistantMessage,
  ]);

  sendAiChatFailureEvent({
    projectId: params.projectId,
    userId: params.userId,
    chatId: params.chatId,
    errorMessage,
    provider: params.aiConfig.provider,
    model: params.aiConfig.model,
  });
}

/**
 * Extracts string content from a CoreMessage - in our context, content is always a string
 */
function getMessageText(message: CoreMessage): string {
  if (typeof message.content !== 'string') {
    throw new Error(
      'Expected message content to be a string in code generation context',
    );
  }
  return message.content;
}

/**
 * Initializes a tool call by writing the necessary streaming messages to the server response
 */
function initializeToolCall(params: {
  toolCallId: string;
  toolName: string;
  message: string;
  serverResponse: NodeJS.WritableStream;
}): void {
  const { toolCallId, toolName, message, serverResponse } = params;

  serverResponse.write(
    buildToolCallStreamingStartMessage(toolCallId, toolName),
  );
  serverResponse.write(
    buildToolCallDeltaMessage(toolCallId, toolName, `{"message":"${message}"}`),
  );
  serverResponse.write(
    buildToolCallMessage({
      type: 'tool-call',
      toolCallId,
      toolName,
      args: { message },
    }),
  );
}

/*
 * Handles code generation requests using streamCode for structured output.
 */
export async function handleCodeGenerationRequest(
  params: CodeMessageParams,
): Promise<void> {
  const {
    chatId,
    userId,
    projectId,
    newMessage,
    additionalContext,
    serverResponse,
    conversation: { chatContext, chatHistory },
  } = params;

  serverResponse.write(buildMessageIdMessage(generateMessageId()));

  const toolCallId = generateToolId();
  initializeToolCall({
    toolCallId,
    toolName: GENERATE_CODE_TOOL_NAME,
    message: getMessageText(newMessage),
    serverResponse,
  });

  const llmConfigResult = await getLLMConfig(projectId);

  chatHistory.push(newMessage);
  const { aiConfig, languageModel } = llmConfigResult;

  const enrichedContext = additionalContext
    ? await enrichContext(additionalContext, projectId, {
        includeCurrentStepOutput: IncludeOptions.ALWAYS,
      })
    : undefined;

  const prompt = await getBlockSystemPrompt(chatContext, enrichedContext);

  sendAiChatMessageSendEvent({
    projectId,
    userId,
    chatId,
    provider: aiConfig.provider,
  });

  let codeResult: CodeGenerationResult | null = null;

  let resolveResult: () => void;
  let rejectResult: (reason?: unknown) => void;

  const resultPromise = new Promise<void>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  try {
    const result = streamCode({
      chatHistory,
      languageModel,
      aiConfig,
      systemPrompt: prompt,
      onFinish: async (result) => {
        if (result.object) {
          codeResult = result.object;
        }
        resolveResult();
      },
      onError: (error) => {
        logger.error('Failed to generate code', {
          error,
        });
        rejectResult(error);
      },
    });

    // Stream the code generation in real-time
    const stream = result.toTextStreamResponse();
    await streamCodeGenerationProgress(stream, serverResponse, toolCallId);

    await resultPromise;

    if (!codeResult) {
      throw new Error('No code generation result received');
    }

    // codeResult variable assigned in async callback so TS type narrowing not working as expected
    const finalCodeResult = codeResult as CodeGenerationResult;

    const toolResult = {
      toolCallId,
      result: {
        code: finalCodeResult.code || '',
        packageJson: finalCodeResult.packageJson || '{}',
      },
    };
    serverResponse.write(buildToolResultMessage(toolResult));

    serverResponse.write(buildFinishMessage('tool-calls'));
    serverResponse.write(buildDoneMessage('tool-calls'));

    serverResponse.write(buildTextMessage(finalCodeResult.textAnswer));

    serverResponse.write(buildFinishMessage('stop'));
    serverResponse.write(buildDoneMessage('stop'));

    const saveToolCallId = generateToolId();

    const assistantMessage: CoreMessage = {
      role: ROLE_ASSISTANT,
      content: [
        {
          type: 'tool-call',
          toolCallId: saveToolCallId,
          toolName: GENERATE_CODE_TOOL_NAME,
          args: { message: newMessage.content },
        },
        {
          type: 'text',
          text: finalCodeResult.textAnswer || '',
        },
      ],
    };

    const toolResultMessage: CoreMessage = {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: saveToolCallId,
          toolName: GENERATE_CODE_TOOL_NAME,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  code: finalCodeResult.code || '',
                  packageJson: finalCodeResult.packageJson || '{}',
                }),
              },
            ],
            isError: false,
          },
        },
      ],
    };

    await saveChatHistory(chatId, userId, projectId, [
      ...chatHistory,
      assistantMessage,
      toolResultMessage,
    ]);
  } catch (error) {
    await handleCodeGenerationError(error, {
      chatId,
      userId,
      projectId,
      chatHistory,
      serverResponse,
      aiConfig,
    });
  } finally {
    serverResponse.write(buildDoneMessage('stop'));
    serverResponse.end();
  }
}
