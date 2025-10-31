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
import fs from 'fs';
import { sanitizeMessages } from '../mcp/tool-utils';
import { createVoidTool } from '../mcp/void-tool';
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

  const availableTools = Object.keys(tools ?? {});
  const availableToolsString =
    availableTools.length > 0 ? `"${availableTools.join(', ')}"` : 'none';

  fs.writeFileSync(
    'prompt.txt',
    systemPrompt +
      '\n\n' +
      'IMPORTANT: Only use the tools that are provided to you. Do not make up or suggest tools that are not provided to you, even if you see they were previously available in the history. ' +
      'The **only available** tools are: ' +
      availableToolsString,
  );

  // write the tools to a json file with timestamp
  const timestamp = new Date().toISOString();
  fs.writeFileSync(
    `tools_${timestamp}.json`,
    JSON.stringify(
      {
        timestamp,
        toolsCount: Object.keys(tools ?? {}).length,
        tools: Object.keys(tools ?? {}),
      },
      null,
      2,
    ),
  );

  const cachedTools = addCacheControlToTools(tools);
  const toolsProxy =
    cachedTools != null
      ? new Proxy(cachedTools, {
          get: (target, prop: string | symbol): unknown => {
            if (typeof prop === 'symbol') {
              return undefined;
            }
            if (prop in target) {
              return target[prop];
            }
            return createVoidTool(prop);
          },
        })
      : undefined;

  const { fullStream } = streamText({
    model: languageModel,
    system: systemPrompt,
    messages: currentMessages,
    ...aiConfig.modelSettings,
    tools: toolsProxy,
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
        system:
          systemPrompt +
          '\n\n' +
          'IMPORTANT: Only use the tools that are provided to you. Do not make up or suggest tools that are not provided to you, even if you see they were previously available in the history. ' +
          'The **only available** tools are: ' +
          availableToolsString,
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
