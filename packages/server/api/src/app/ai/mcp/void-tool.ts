import { tool, Tool } from 'ai';
import { z } from 'zod';

export const createVoidTool = (name: string): Tool => {
  return tool({
    name,
    description: `This tool does not exist: ${name}`,
    inputSchema: z.object({}),
    execute: async () => ({
      error: `Tool does not exist: ${name}`,
    }),
  });
};
