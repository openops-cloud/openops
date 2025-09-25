import { isLLMTelemetryEnabled } from '@openops/common';
import { AiConfig } from '@openops/shared';
import {
  convertToModelMessages,
  LanguageModel,
  ModelMessage,
  stepCountIs,
  streamText,
  StreamTextOnErrorCallback,
  StreamTextOnFinishCallback,
  StreamTextOnStepFinishCallback,
  StreamTextResult,
  ToolSet,
} from 'ai';
import { ChatHistory } from './types';

type AICallSettings = {
  tools?: ToolSet;
  aiConfig: AiConfig;
  systemPrompt: string;
  maxRecursionDepth: number;
  newMessages: ModelMessage[];
  chatHistory: ChatHistory;
  languageModel: LanguageModel;
  onStepFinish?: StreamTextOnStepFinishCallback<ToolSet>;
  onFinish?: StreamTextOnFinishCallback<ToolSet>;
  onError?: StreamTextOnErrorCallback;
};

const MAX_RETRIES = 1;

export function getLLMAsyncStream(
  params: AICallSettings,
): StreamTextResult<ToolSet, never> {
  const {
    maxRecursionDepth,
    languageModel,
    systemPrompt,
    chatHistory,
    aiConfig,
    tools,
    onStepFinish,
    onFinish,
    onError,
  } = params;

  const hasTools = tools && Object.keys(tools).length !== 0;
  const toolChoice = hasTools ? 'auto' : 'none';

  return streamText({
    model: languageModel,
    system: systemPrompt,
    messages: convertToModelMessages(chatHistory.messages),
    ...aiConfig.modelSettings,
    tools,
    toolChoice,
    maxRetries: MAX_RETRIES,
    stopWhen: stepCountIs(maxRecursionDepth),
    onStepFinish,
    onFinish,
    onError,
    experimental_telemetry: { isEnabled: isLLMTelemetryEnabled() },
  });
}
