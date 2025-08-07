import { AiConfig } from '@openops/shared';
import {
  LanguageModel,
  ModelMessage,
  stepCountIs,
  streamText,
  StreamTextOnFinishCallback,
  StreamTextOnStepFinishCallback,
  TextStreamPart,
  ToolSet,
} from 'ai';

type AICallSettings = {
  tools?: ToolSet;
  aiConfig: AiConfig;
  systemPrompt: string;
  maxRecursionDepth: number;
  newMessages: ModelMessage[];
  chatHistory: ModelMessage[];
  languageModel: LanguageModel;
  onStepFinish?: StreamTextOnStepFinishCallback<ToolSet>;
  onFinish?: StreamTextOnFinishCallback<ToolSet>;
};

const MAX_RETRIES = 1;

export function getLLMAsyncStream(
  params: AICallSettings,
): AsyncIterable<TextStreamPart<ToolSet>> {
  const {
    maxRecursionDepth,
    languageModel,
    systemPrompt,
    chatHistory,
    aiConfig,
    tools,
    onStepFinish,
    onFinish,
  } = params;

  const hasTools = tools && Object.keys(tools).length !== 0;
  const toolChoice = hasTools ? 'auto' : 'none';

  const { fullStream } = streamText({
    model: languageModel,
    system: systemPrompt,
    messages: chatHistory,
    ...aiConfig.modelSettings,
    tools,
    toolChoice,
    maxRetries: MAX_RETRIES,
    stopWhen: stepCountIs(maxRecursionDepth),
    onStepFinish,
    onFinish,
    async onError({ error }): Promise<void> {
      throw error;
    },
  });

  return fullStream;
}
