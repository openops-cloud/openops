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
import { generateMessageId, generateToolId } from './ai-id-generators';
import { streamCode } from './code.service';
import { enrichContext, IncludeOptions } from './context-enrichment.service';
import { getBlockSystemPrompt } from './prompts.service';
import { RequestContext } from './types';

type CodeMessageParams = RequestContext & {
  newMessage: CoreMessage;
  additionalContext?: ChatFlowContext;
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

/* 
Handles code generation requests using streamCode for structured output.
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
  } = params;

  serverResponse.write(`f:{"messageId":"${generateMessageId()}"}\n`);

  const toolCallId = generateToolId();
  serverResponse.write(
    `b:{"type":"tool-call-streaming-start","toolCallId":"${toolCallId}","toolName":"${GENERATE_CODE_TOOL_NAME}"}\n`,
  );
  serverResponse.write(
    `c:{"type":"tool-call-delta","toolCallId":"${toolCallId}","toolName":"${GENERATE_CODE_TOOL_NAME}","argsTextDelta":"{\\"message\\":\\"${newMessage.content}\\"}"}\n`,
  );

  serverResponse.write(
    `9:{"type":"tool-call","toolCallId":"${toolCallId}","toolName":"${GENERATE_CODE_TOOL_NAME}","args":{"message":"${newMessage.content}"}}\n`,
  );

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

    // Stream the code generation in real-time
    const stream = result.toTextStreamResponse();
    await streamCodeGenerationProgress(stream, serverResponse, toolCallId);

    await resultPromise;

    if (!codeResult) {
      throw new Error('No code generation result received');
    }

    const toolResult = {
      toolCallId,
      result: {
        code:
          (codeResult as { code?: string; packageJson?: string }).code || '',
        packageJson:
          (codeResult as { code?: string; packageJson?: string }).packageJson ||
          '{}',
      },
    };
    serverResponse.write(`a:${JSON.stringify(toolResult)}\n`);

    const finishMessage = {
      finishReason: 'tool-calls',
      usage: { promptTokens: null, completionTokens: null },
      isContinued: false,
    };
    serverResponse.write(`e:${JSON.stringify(finishMessage)}\n`);
    serverResponse.write(`d:${JSON.stringify(finishMessage)}\n`);

    serverResponse.write(
      `0:"${(codeResult as { textAnswer: string }).textAnswer}"\n`,
    );

    const textFinishMessage = {
      finishReason: 'stop',
      usage: { promptTokens: null, completionTokens: null },
      isContinued: false,
    };
    serverResponse.write(`e:${JSON.stringify(textFinishMessage)}\n`);
    serverResponse.write(`d:${JSON.stringify(textFinishMessage)}\n`);

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
          toolName: GENERATE_CODE_TOOL_NAME,
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
    serverResponse.write(`d:{"finishReason":"stop"}\n`);
    serverResponse.end();
  }
}
