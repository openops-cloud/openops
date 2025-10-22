import { updateActiveObservation, updateActiveTrace } from '@langfuse/tracing';
import { isLLMTelemetryEnabled } from '@openops/common';
import { AiConfigParsed } from '@openops/shared';
import { trace } from '@opentelemetry/api';
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
import { sanitizeMessages } from '../mcp/tool-utils';
import {
  addCacheControlToMessages,
  addCacheControlToTools,
} from './context-cache.helper';

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
  const currentMessages = sanitizeMessages(chatHistory);

  const { fullStream } = streamText({
    model: languageModel,
    system: systemPrompt,
    messages: currentMessages,
    ...aiConfig.modelSettings,
    tools: addCacheControlToTools(tools),
    toolChoice,
    maxRetries: MAX_RETRIES,
    stopWhen: stepCountIs(maxRecursionDepth),
    onStepFinish,
    onFinish: async (result) => {
      const outputText = result.text || '';
      updateActiveObservation({
        output: outputText,
      });

      await onFinish?.(result);
      trace.getActiveSpan()?.end();
    },
    onAbort,
    prepareStep: async ({ messages }) => {
      return {
        messages: addCacheControlToMessages(messages),
      };
    },
    abortSignal,
    experimental_telemetry: { isEnabled: isLLMTelemetryEnabled() },
    async onError({ error }): Promise<void> {
      updateActiveObservation({
        output: error,
        level: 'ERROR',
      });
      updateActiveTrace({
        output: error,
      });

      trace.getActiveSpan()?.end();
      throw error;
    },
  });

  return fullStream;
}
