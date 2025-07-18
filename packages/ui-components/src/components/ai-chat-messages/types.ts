import { SourceCode } from '@openops/shared';

/**
 * @deprecated use shared types instead from ai sdk
 */
export enum AIChatMessageRole {
  user = 'user',
  assistant = 'assistant',
}

/**
 * @deprecated use shared types instead from ai sdk
 */
export type AIChatMessageContent =
  | string
  | {
      parts: (
        | { type: 'text'; content: string }
        | { type: 'sourcecode'; content: SourceCode }
      )[];
    };

/**
 * @deprecated use shared types instead from ai sdk
 */
export type AIChatMessage = {
  id: string;
  role: keyof typeof AIChatMessageRole;
  content: AIChatMessageContent;
};
