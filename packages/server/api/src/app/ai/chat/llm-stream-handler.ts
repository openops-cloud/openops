import { isLLMTelemetryEnabled } from '@openops/common';
import { AiConfigParsed } from '@openops/shared';
import {
  LanguageModel,
  ModelMessage,
  stepCountIs,
  StepResult,
  streamText,
  StreamTextOnFinishCallback,
  StreamTextOnStepFinishCallback,
  TextStreamPart,
  ToolSet,
} from 'ai';

type StreamTextOnAbortCallback<TOOLS extends ToolSet> = (event: {
  readonly steps: StepResult<TOOLS>[];
}) => PromiseLike<void> | void;

type AICallSettings = {
  tools?: ToolSet;
  aiConfig: AiConfigParsed;
  systemPrompt: string;
  maxRecursionDepth: number;
  newMessages: ModelMessage[];
  chatHistory: ModelMessage[];
  languageModel: LanguageModel;
  onStepFinish?: StreamTextOnStepFinishCallback<ToolSet>;
  onFinish?: StreamTextOnFinishCallback<ToolSet>;
  onAbort?: StreamTextOnAbortCallback<ToolSet>;
  abortSignal: AbortSignal;
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
    onAbort,
    abortSignal,
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
    onAbort,
    abortSignal,
    experimental_telemetry: { isEnabled: isLLMTelemetryEnabled() },
    async onError({ error }): Promise<void> {
      throw error;
    },
  });

  return fullStream;
}
