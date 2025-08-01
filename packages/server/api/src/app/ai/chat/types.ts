import { TextPart, ToolCallPart } from 'ai';
import { ServerResponse } from 'node:http';

export type ToolResult = {
  toolCallId: string;
  result: unknown;
  type?: string;
};

export type ToolCallPartWithResult = {
  result?: unknown;
} & ToolCallPart;

export type MessageWithMergedToolResults = {
  role: 'user' | 'assistant' | 'system';
  content: string | (TextPart | ToolCallPartWithResult)[];
};

export type RequestContext = {
  userId: string;
  chatId: string;
  projectId: string;
  serverResponse: ServerResponse;
};
