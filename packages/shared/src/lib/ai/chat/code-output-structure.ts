import { z } from 'zod';

export const codeLLMSchema = z.object({
  code: z.string(),
  packageJson: z.string(),
  description: z.string(),
});

export type CodeLLMSchema = z.infer<typeof codeLLMSchema>;
