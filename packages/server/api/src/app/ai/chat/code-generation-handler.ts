import { logger } from '@openops/server-shared';
import { ChatFlowContext } from '@openops/shared';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  ModelMessage,
  TextUIPart,
  UIDataTypes,
  UIMessage,
  UIMessageStreamWriter,
  UITools,
} from 'ai';
import { sendAiChatFailureEvent } from '../../telemetry/event-models';
import { saveChatHistory } from './ai-chat.service';
import { generateMessageId, generateToolId } from './ai-id-generators';
import { generateCode } from './code.service';
import { enrichContext, IncludeOptions } from './context-enrichment.service';
import { extractMessage } from './message-extractor';
import { getBlockSystemPrompt } from './prompts.service';
import { ChatHistory, ChatProcessingContext, RequestContext } from './types';

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
    chatHistory: ChatHistory;
    aiConfig: { provider: string; model: string };
    writer: UIMessageStreamWriter<UIMessage<unknown, UIDataTypes, UITools>>;
  },
): Promise<void> {
  const errorMessage = extractMessage(error);

  logger.warn(
    `An unrecoverable exception occurred in the conversation. Message: ${errorMessage}`,
    error,
  );

  const { writer } = params;

  writer.write({
    type: 'text-start',
    id: params.messageId,
  });
  writer.write({
    type: 'text-delta',
    id: params.messageId,
    delta: errorMessage,
  });
  writer.write({
    type: 'text-end',
    id: params.messageId,
  });

  //TODO: Probably not needed anymore
  // const errorAssistantMessage: ModelMessage = {
  //   role: ROLE_ASSISTANT,
  //   content: [
  //     {
  //       type: 'text',
  //       text: errorMessage,
  //     },
  //   ],
  // };

  // await saveChatHistory({
  //   chatId: params.chatId,
  //   userId: params.userId,
  //   projectId: params.projectId,
  //   chatHistory: {
  //     ...params.chatHistory,
  //     messages: [...params.chatHistory.messages, errorAssistantMessage],
  //   },
  // });

  sendAiChatFailureEvent({
    projectId: params.projectId,
    userId: params.userId,
    chatId: params.chatId,
    errorMessage,
    provider: params.aiConfig.provider,
    model: params.aiConfig.model,
  });
}

export function getMessageTextStrict<
  M = unknown,
  D extends UIDataTypes = UIDataTypes,
  T extends UITools = UITools,
>(message: UIMessage<M, D, T>): string {
  if (message.parts.length !== 1) {
    throw new Error(`Expected exactly one part, got ${message.parts.length}`);
  }

  const part = message.parts[0];
  if (part.type !== 'text') {
    throw new Error(`Expected part of type "text", got "${part.type}"`);
  }

  return (part as TextUIPart).text;
}
/**
 * Initializes a tool call by writing the necessary streaming messages to the server response
 */
function initializeToolCall(params: {
  toolCallId: string;
  toolName: string;
  message: string;
  writer: UIMessageStreamWriter<UIMessage<unknown, UIDataTypes, UITools>>;
}): void {
  const { toolCallId, toolName, message, writer } = params;
  writer.write({
    type: 'tool-input-start',
    toolCallId,
    toolName,
  });
  writer.write({
    type: 'tool-input-available',
    toolCallId,
    toolName,
    input: message,
  });
}

/*
 * Handles code generation requests using streamCode for structured output.
 */
export async function handleCodeGenerationRequest(
  params: CodeMessageParams,
): Promise<Response> {
  const {
    chatId,
    userId,
    projectId,
    newMessage,
    additionalContext,
    aiConfig,
    languageModel,
    conversation: { chatContext, chatHistory },
  } = params;

  const newMessageId = generateMessageId();

  const toolCallId = generateToolId();

  const enrichedContext = additionalContext
    ? await enrichContext(additionalContext, projectId, {
        includeCurrentStepOutput: IncludeOptions.ALWAYS,
      })
    : undefined;

  const prompt = await getBlockSystemPrompt(chatContext, enrichedContext);

  const stream = createUIMessageStream<UIMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: 'start' });
      writer.write({ type: 'start-step' });

      initializeToolCall({
        toolCallId,
        toolName: GENERATE_CODE_TOOL_NAME,
        message: getMessageTextStrict(newMessage),
        writer,
      });

      try {
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

        writer.write({
          type: 'tool-output-available',
          toolCallId,
          output: toolResult.result,
        });

        writer.write({
          type: 'finish-step',
        });

        writer.write({
          type: 'start-step',
        });
        writer.write({
          type: 'text-start',
          id: newMessageId,
        });
        writer.write({
          type: 'text-delta',
          id: newMessageId,
          delta: finalCodeResult.textAnswer,
        });
        writer.write({
          type: 'text-end',
          id: newMessageId,
        });

        writer.write({
          type: 'finish-step',
        });

        writer.write({ type: 'finish' });
        // const saveToolCallId = generateToolId();

        // const assistantMessage: ModelMessage = {
        //   role: ROLE_ASSISTANT,
        //   content: [
        //     {
        //       type: 'tool-call',
        //       toolCallId: saveToolCallId,
        //       toolName: GENERATE_CODE_TOOL_NAME,
        //       input: { message: newMessage.content },
        //     },
        //   ],
        // };

        // const assistantToolResultMessage: ModelMessage = {
        //   role: ROLE_ASSISTANT,
        //   content: finalCodeResult.textAnswer || '',
        // };

        // const toolResultMessage: ModelMessage = {
        //   role: 'tool',
        //   content: [
        //     {
        //       type: 'tool-result',
        //       toolCallId: saveToolCallId,
        //       toolName: GENERATE_CODE_TOOL_NAME,
        //       output: {
        //         type: 'json',
        //         value: {
        //           code: finalCodeResult.code || '',
        //           packageJson: finalCodeResult.packageJson || '{}',
        //         },
        //       },
        //     },
        //   ],
        // };

        // await saveChatHistory({
        //   chatId,
        //   userId,
        //   projectId,
        //   chatHistory: {
        //     ...chatHistory,
        //     messages: [
        //       ...chatHistory.messages,
        //       assistantMessage,
        //       toolResultMessage,
        //       assistantToolResultMessage,
        //     ],
        //   },
        // });
      } catch (error) {
        await handleCodeGenerationError(error, {
          messageId: newMessageId,
          chatId,
          userId,
          projectId,
          chatHistory,
          writer,
          aiConfig,
        });
      }
    },
    onFinish: ({ messages }) => {
      return saveChatHistory({
        chatId,
        userId,
        projectId,
        chatHistory: { ...chatHistory, messages },
      });
    },
    originalMessages: chatHistory.messages,
  });

  const response = createUIMessageStreamResponse({
    stream,
  });

  return response;
  // const heartbeatWrapper = createHeartbeatResponseWrapper();
  // return heartbeatWrapper(response);
}
