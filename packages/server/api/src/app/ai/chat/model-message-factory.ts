import { ModelMessage } from 'ai';

export function createUserMessage(content: string): ModelMessage {
  return {
    role: 'user',
    content,
  };
}
