import { TextPart, ToolCallPart } from 'ai';

export type ToolCallPartWithResult = {
  output?: unknown;
} & ToolCallPart;

export type MessageWithMergedToolResults = {
  role: 'user' | 'assistant' | 'system';
  content: string | (TextPart | ToolCallPartWithResult)[];
};
