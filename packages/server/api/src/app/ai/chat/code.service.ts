import { AiConfig, CodeSchema, codeSchema } from '@openops/shared';
import {
  CoreMessage,
  LanguageModel,
  streamObject,
  StreamObjectResult,
} from 'ai';

export const streamCode = ({
  messages,
  languageModel,
  aiConfig,
  systemPrompt,
}: {
  messages: CoreMessage[];
  languageModel: LanguageModel;
  aiConfig: AiConfig;
  systemPrompt: string;
}): StreamObjectResult<Partial<CodeSchema>, CodeSchema, never> =>
  streamObject({
    model: languageModel,
    system: systemPrompt,
    messages,
    schema: codeSchema,
    ...aiConfig.modelSettings,
  });
