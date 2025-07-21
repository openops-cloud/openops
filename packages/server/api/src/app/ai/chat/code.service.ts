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
  messages: CoreMessage[];
  languageModel: LanguageModel;
  aiConfig: AiConfig;
  systemPrompt: string;
  onFinish: StreamObjectOnFinishCallback<UnifiedCodeLLMSchema> | undefined;
  onError: (error: unknown) => void;
};

export const streamCode = ({
  messages,
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
    messages,
    systemPrompt,
  });
  return streamObject({
    model: languageModel,
    system: systemPrompt,
    messages,
    ...aiConfig.modelSettings,
    onFinish,
    onError,
    schema: unifiedCodeLLMSchema,
    experimental_telemetry: { isEnabled: isLLMTelemetryEnabled() },
  });
};
