import { z } from 'zod';

export const codeSchema = z.object({
  code: z.string(),
  packageJson: z.string(),
  description: z.string(),
});

export type CodeSchema = z.infer<typeof codeSchema>;
