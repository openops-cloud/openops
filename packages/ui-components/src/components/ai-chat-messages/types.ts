export const AIChatMessageRole = {
  user: 'user',
  assistant: 'assistant',
  tool: 'tool',
} as const;

export type AIChatMessage = {
  id: string;
  role: keyof typeof AIChatMessageRole;
  content: string;
};
