import { SourceCode } from '@openops/shared';

export enum AIChatMessageRole {
  user = 'user',
  assistant = 'assistant',
}

export type AIChatMessageContent =
  | string
  | {
      type: 'structured';
      parts: (
        | { type: 'text'; content: string }
        | { type: 'code'; content: string; language?: string }
        | { type: 'sourcecode'; content: SourceCode }
      )[];
    };

export type AIChatMessage = {
  id: string;
  role: keyof typeof AIChatMessageRole;
  content: AIChatMessageContent;
};
