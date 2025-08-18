import { z } from 'zod';

const codeDescription = 'The code to be executed';
const packageJsonDescription =
  'The package.json to be executed. If no dependecies required return "{}"';
const textAnswerDescription =
  'Mandatory text to the user. If code was generated, provide a short description of the code. If you need input or clarification, ask the user. If no code was generated, explain why.';

export const codeLLMSchema = z.object({
  code: z.string().describe(codeDescription),
  packageJson: z.string().describe(packageJsonDescription),
  textAnswer: z.string().describe(textAnswerDescription),
  type: z.literal('code'),
});

export type CodeSchema = z.infer<typeof codeLLMSchema>;

export const unifiedCodeLLMSchema = z.object({
  type: z
    .enum(['code', 'reply'])
    .describe(
      'The type of the response. Always return "code" if you are generating code, and "reply" if you are answering the user question or asking for clarifications.',
    ),
  code: z.string().optional().describe(codeDescription),
  packageJson: z.string().optional().describe(packageJsonDescription),
  textAnswer: z.string().describe(textAnswerDescription),
});

export type UnifiedCodeLLMSchema = z.infer<typeof unifiedCodeLLMSchema>;
