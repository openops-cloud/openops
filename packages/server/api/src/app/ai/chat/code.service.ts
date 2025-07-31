import { isLLMTelemetryEnabled } from '@openops/common';
import { logger } from '@openops/server-shared';
import {
  AiConfig,
  unifiedCodeLLMSchema,
  UnifiedCodeLLMSchema,
} from '@openops/shared';
import {
  CoreMessage,
  LanguageModel,
  streamObject,
  StreamObjectOnFinishCallback,
  StreamObjectResult,
} from 'ai';

type StreamCodeOptions = {
  chatHistory: CoreMessage[];
  languageModel: LanguageModel;
  aiConfig: AiConfig;
  systemPrompt: string;
  onFinish: StreamObjectOnFinishCallback<UnifiedCodeLLMSchema> | undefined;
  onError: (error: unknown) => void;
};

export const streamCode = ({
  chatHistory,
  languageModel,
  aiConfig,
  systemPrompt,
  onFinish,
  onError,
}: StreamCodeOptions): StreamObjectResult<
  Partial<UnifiedCodeLLMSchema>,
  UnifiedCodeLLMSchema,
  never
> => {
  logger.debug('streamCode', {
    chatHistory,
    systemPrompt,
  });
  return streamObject({
    model: languageModel,
    system: systemPrompt,
    messages: chatHistory,
    ...aiConfig.modelSettings,
    onFinish,
    onError,
    schema: unifiedCodeLLMSchema,
    experimental_telemetry: { isEnabled: isLLMTelemetryEnabled() },
  });
};
