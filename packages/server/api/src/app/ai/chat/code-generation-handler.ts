import { logger } from '@openops/server-shared';
import { ChatFlowContext } from '@openops/shared';
import { CoreMessage } from 'ai';
import {
  sendAiChatFailureEvent,
  sendAiChatMessageSendEvent,
} from '../../telemetry/event-models';
import {
  getConversation,
  getLLMConfig,
  saveChatHistory,
} from './ai-chat.service';
import { generateToolId } from './ai-id-generators';
import { streamCode } from './code.service';
import { enrichContext, IncludeOptions } from './context-enrichment.service';
import { getBlockSystemPrompt } from './prompts.service';
import { RequestContext } from './types';

type CodeMessageParams = RequestContext & {
  newMessage: CoreMessage;
  additionalContext?: ChatFlowContext;
};

/* 
Handles code generation requests using streamCode for structured output.
 */
export async function handleCodeGenerationRequest(
  params: CodeMessageParams,
): Promise<Response> {
  const { chatId, userId, projectId, newMessage, additionalContext } = params;

  const llmConfigResult = await getLLMConfig(projectId);
  const conversationResult = await getConversation(chatId, userId, projectId);

  conversationResult.chatHistory.push(newMessage);

  const { chatContext, chatHistory } = conversationResult;
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

  let codeResult: {
    type: string;
    code?: string;
    packageJson?: string;
    textAnswer: string;
  } | null = null;

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

    const streamResponse = result.toTextStreamResponse();
    const reader = streamResponse.body?.getReader();
    if (reader) {
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
      }
    }

    await resultPromise;

    if (!codeResult) {
      throw new Error('No code generation result received');
    }

    const toolCallId = generateToolId();

    // Create the streaming response manually
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const toolCallMessage = {
          toolCallId,
          toolName: 'generate_code',
          args: { message: newMessage.content },
        };
        controller.enqueue(
          encoder.encode(`9:${JSON.stringify(toolCallMessage)}\n`),
        );

        const toolResult = {
          toolCallId,
          result: {
            code:
              (codeResult as { code?: string; packageJson?: string }).code ||
              '',
            packageJson:
              (codeResult as { code?: string; packageJson?: string })
                .packageJson || '{}',
          },
        };
        controller.enqueue(encoder.encode(`a:${JSON.stringify(toolResult)}\n`));

        const finishMessage = {
          finishReason: 'tool-calls',
          usage: { promptTokens: null, completionTokens: null },
          isContinued: false,
        };
        controller.enqueue(
          encoder.encode(`e:${JSON.stringify(finishMessage)}\n`),
        );
        controller.enqueue(
          encoder.encode(`d:${JSON.stringify(finishMessage)}\n`),
        );

        controller.enqueue(
          encoder.encode(
            `0:"${(codeResult as { textAnswer: string }).textAnswer}"\n`,
          ),
        );

        const textFinishMessage = {
          finishReason: 'stop',
          usage: { promptTokens: null, completionTokens: null },
          isContinued: false,
        };
        controller.enqueue(
          encoder.encode(`e:${JSON.stringify(textFinishMessage)}\n`),
        );
        controller.enqueue(
          encoder.encode(`d:${JSON.stringify(textFinishMessage)}\n`),
        );

        controller.close();
      },
    });

    const saveToolCallId = generateToolId();

    const assistantMessage: CoreMessage = {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId: saveToolCallId,
          toolName: 'generate_code',
          args: { message: newMessage.content },
        },
        {
          type: 'text',
          text: (codeResult as { textAnswer: string }).textAnswer || '',
        },
      ],
    };

    const toolResultMessage: CoreMessage = {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: saveToolCallId,
          toolName: 'generate_code',
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  code:
                    (codeResult as { code?: string; packageJson?: string })
                      .code || '',
                  packageJson:
                    (codeResult as { code?: string; packageJson?: string })
                      .packageJson || '{}',
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

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(errorMessage, error);

    sendAiChatFailureEvent({
      projectId,
      userId,
      chatId,
      errorMessage,
      provider: aiConfig.provider,
      model: aiConfig.model,
    });
    throw error;
  }
}
