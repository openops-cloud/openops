import { logger } from '@openops/server-shared';
import {
  AiConfig,
  unifiedCodeResponseSchema,
  UnifiedResponseSchema,
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
  onFinish: StreamObjectOnFinishCallback<UnifiedResponseSchema> | undefined;
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
  Partial<UnifiedResponseSchema>,
  UnifiedResponseSchema,
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
    schema: unifiedCodeResponseSchema,
  });
};
