import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import { CoreMessage, LanguageModel, streamText, ToolSet } from 'ai';

const maxRecursionDepth = system.getNumberOrThrow(
  AppSystemProp.MAX_LLM_CALLS_WITHOUT_INTERACTION,
);

type AICallSettings = {
  tools?: ToolSet;
  aiConfig: AiConfig;
  systemPrompt: string;
  newMessages: CoreMessage[];
  chatHistory: CoreMessage[];
  languageModel: LanguageModel;
  serverResponse: NodeJS.WritableStream;
};

export async function streamAIResponse(params: AICallSettings): Promise<void> {
  const {
    serverResponse,
    languageModel,
    systemPrompt,
    chatHistory,
    newMessages,
    aiConfig,
    tools,
  } = params;
  let stepCount = 0;

  const hasTools = tools && Object.keys(tools).length !== 0;
  const toolChoice = hasTools ? 'auto' : 'none';

  const { textStream } = streamText({
    model: languageModel,
    system: systemPrompt,
    messages: chatHistory,
    ...aiConfig.modelSettings,
    tools,
    toolChoice,
    maxRetries: 1,
    maxSteps: maxRecursionDepth,
    async onStepFinish({ finishReason }): Promise<void> {
      stepCount++;
      if (finishReason !== 'stop' && stepCount >= maxRecursionDepth) {
        const message = `Maximum recursion depth (${maxRecursionDepth}) reached. Terminating recursion.`;
        sendMessageToStream(serverResponse, message);
        logger.warn(message);
      }
    },
    async onError({ error }): Promise<void> {
      throw error;
    },
    async onFinish(result): Promise<void> {
      if (result.finishReason === 'length') {
        throw new Error(
          'The message was truncated because the maximum tokens for the context window was reached.',
        );
      }

      const messages = result.response.messages;
      newMessages.push(...messages);
    },
  });

  for await (const textPart of textStream) {
    sendMessageToStream(params.serverResponse, textPart);
  }
}

function sendMessageToStream(
  responseStream: NodeJS.WritableStream,
  message: string,
): void {
  responseStream.write(`0:${JSON.stringify(message)}\n`);
}
