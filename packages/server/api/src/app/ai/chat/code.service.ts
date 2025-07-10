import { AiConfig } from '@openops/shared';
import {
  CoreMessage,
  LanguageModel,
  streamObject,
  StreamObjectResult,
} from 'ai';
import { z } from 'zod';

const codeSchema = z.object({
  code: z.string(),
  packageJson: z.string(),
  description: z.string(),
});

type CodeSchema = z.infer<typeof codeSchema>;

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
}): StreamObjectResult<Partial<CodeSchema>, CodeSchema, never> => {
  return streamObject({
    model: languageModel,
    system: systemPrompt,
    messages,
    schema: codeSchema,
    ...aiConfig.modelSettings,
  });
};
