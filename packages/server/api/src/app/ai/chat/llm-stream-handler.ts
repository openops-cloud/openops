import { isLLMTelemetryEnabled } from '@openops/common';
import { AiConfig } from '@openops/shared';
import {
  CoreMessage,
  LanguageModel,
  streamText,
  StreamTextOnFinishCallback,
  StreamTextOnStepFinishCallback,
  TextStreamPart,
  ToolSet,
} from 'ai';
import { gpt5SchemaAdapter } from './adapters';

type AICallSettings = {
  tools?: ToolSet;
  aiConfig: AiConfig;
  systemPrompt: string;
  maxRecursionDepth: number;
  newMessages: CoreMessage[];
  chatHistory: CoreMessage[];
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

  const updatedTools: ToolSet = {};
  if (tools) {
    for (const [toolName, tool] of Object.entries(tools)) {
      const schema = tool.parameters.jsonSchema;

      const shouldUseSchemaAdapter = languageModel.modelId.includes('gpt-5');
      const fixedSchema = shouldUseSchemaAdapter
        ? gpt5SchemaAdapter(schema as Record<string, unknown>)
        : schema;

      updatedTools[toolName] = {
        ...tool,
        parameters: {
          ...tool.parameters,
          jsonSchema: fixedSchema,
        },
      };
    }
  }

  const { fullStream } = streamText({
    model: languageModel,
    system: systemPrompt,
    messages: chatHistory,
    ...aiConfig.modelSettings,
    tools: updatedTools,
    toolChoice,
    maxRetries: MAX_RETRIES,
    maxSteps: maxRecursionDepth,
    onStepFinish,
    onFinish,
    async onError({ error }): Promise<void> {
      throw error;
    },
    experimental_telemetry: {
      isEnabled: isLLMTelemetryEnabled(),
    },
  });

  return fullStream;
}
