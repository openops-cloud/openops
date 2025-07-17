import { AiConfig, CodeLLMSchema, codeLLMSchema } from '@openops/shared';
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
  onFinish: StreamObjectOnFinishCallback<CodeLLMSchema> | undefined;
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
  Partial<CodeLLMSchema>,
  CodeLLMSchema,
  never
> =>
  streamObject({
    model: languageModel,
    system: systemPrompt,
    messages,
    schema: codeLLMSchema,
    ...aiConfig.modelSettings,
    onFinish,
    onError,
  });
