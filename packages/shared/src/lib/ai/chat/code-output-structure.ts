import { z } from 'zod';

const codeDescription = 'The code to be executed';
const packageJsonDescription =
  'The package.json to be executed. If no dependecies required return "{}"';
const textAnswerDescription =
  'The text answer to the user, if you need to clarify something, or the short description of the code if any code is generated';

export const codeLLMSchema = z.object({
  code: z.string().describe(codeDescription),
  packageJson: z.string().describe(packageJsonDescription),
  textAnswer: z.string().describe(textAnswerDescription),
  type: z.literal('code'),
});

export type CodeSchema = z.infer<typeof codeLLMSchema>;

export const unifiedCodeLLMSchema = z.object({
  type: z.enum(['code', 'reply']),
  code: z.string().optional().describe(codeDescription),
  packageJson: z.string().optional().describe(packageJsonDescription),
  textAnswer: z.string().describe(textAnswerDescription),
});

export type UnifiedCodeLLMSchema = z.infer<typeof unifiedCodeLLMSchema>;
