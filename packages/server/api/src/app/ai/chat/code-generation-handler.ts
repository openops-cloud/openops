import { logger } from '@openops/server-shared';
import { ChatFlowContext } from '@openops/shared';
import { ModelMessage } from 'ai';
import { sendAiChatFailureEvent } from '../../telemetry/event-models';
import { saveChatHistory } from './ai-chat.service';
import { generateMessageId, generateToolId } from './ai-id-generators';
import { generateCode } from './code.service';
import { enrichContext, IncludeOptions } from './context-enrichment.service';
import { getBlockSystemPrompt } from './prompts.service';
import {
  buildTextDeltaPart,
  buildTextEndMessage,
  buildTextStartMessage,
  buildToolInputAvailable,
  buildToolInputStartMessage,
  buildToolOutputAvailableMessage,
  doneMarker,
  finishMessagePart,
  finishStepPart,
  sendTextMessageToStream,
  startMessagePart,
  startStepPart,
} from './stream-message-builder';
import { ChatProcessingContext, RequestContext } from './types';

type CodeMessageParams = RequestContext &
  ChatProcessingContext & {
    additionalContext?: ChatFlowContext;
  };

const GENERATE_CODE_TOOL_NAME = 'generate_code';
const ROLE_ASSISTANT = 'assistant';

/**
 * Handles errors in code generation by creating an assistant message and saving to history
 */
async function handleCodeGenerationError(
  error: unknown,
  params: {
    messageId: string;
    chatId: string;
    userId: string;
    projectId: string;
    chatHistory: ModelMessage[];
    serverResponse: NodeJS.WritableStream;
    aiConfig: { provider: string; model: string };
  },
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.warn(errorMessage, error);

  sendTextMessageToStream(
    params.serverResponse,
    errorMessage,
    params.messageId,
  );

  const errorAssistantMessage: ModelMessage = {
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
function getMessageText(message: ModelMessage): string {
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

  serverResponse.write(buildToolInputStartMessage(toolCallId, toolName));
  serverResponse.write(buildToolInputAvailable(toolCallId, toolName, message));
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
    aiConfig,
    languageModel,
    conversation: { chatContext, chatHistory },
  } = params;

  const newMessageId = generateMessageId();

  try {
    serverResponse.write(startMessagePart);
    serverResponse.write(startStepPart);

    const toolCallId = generateToolId();
    initializeToolCall({
      toolCallId,
      toolName: GENERATE_CODE_TOOL_NAME,
      message: getMessageText(newMessage),
      serverResponse,
    });

    const enrichedContext = additionalContext
      ? await enrichContext(additionalContext, projectId, {
          includeCurrentStepOutput: IncludeOptions.ALWAYS,
        })
      : undefined;

    const prompt = await getBlockSystemPrompt(chatContext, enrichedContext);

    const result = await generateCode({
      chatHistory,
      languageModel,
      aiConfig,
      systemPrompt: prompt,
    });

    if (!result) {
      throw new Error('No code generation result received');
    }

    const finalCodeResult = result.object;

    const toolResult = {
      toolCallId,
      result: {
        code: finalCodeResult.code || '',
        packageJson: finalCodeResult.packageJson || '{}',
      },
    };

    serverResponse.write(
      buildToolOutputAvailableMessage(toolCallId, toolResult.result),
    );

    serverResponse.write(finishStepPart);

    serverResponse.write(startStepPart);
    serverResponse.write(buildTextStartMessage(newMessageId));
    serverResponse.write(
      buildTextDeltaPart(finalCodeResult.textAnswer, newMessageId),
    );
    serverResponse.write(buildTextEndMessage(newMessageId));

    serverResponse.write(finishStepPart);
    serverResponse.write(finishMessagePart);

    const saveToolCallId = generateToolId();

    const assistantMessage: ModelMessage = {
      role: ROLE_ASSISTANT,
      content: [
        {
          type: 'tool-call',
          toolCallId: saveToolCallId,
          toolName: GENERATE_CODE_TOOL_NAME,
          input: { message: newMessage.content },
        },
        {
          type: 'text',
          text: finalCodeResult.textAnswer || '',
        },
      ],
    };

    const toolResultMessage: ModelMessage = {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: saveToolCallId,
          toolName: GENERATE_CODE_TOOL_NAME,
          output: {
            // content: [
            //   {
            type: 'json',
            value: {
              code: finalCodeResult.code || '',
              packageJson: finalCodeResult.packageJson || '{}',
            },
          },
          // ],
          // isError: false,
          // },
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
      messageId: newMessageId,
      chatId,
      userId,
      projectId,
      chatHistory,
      serverResponse,
      aiConfig,
    });
  } finally {
    serverResponse.write(doneMarker);
    serverResponse.end();
  }
}
