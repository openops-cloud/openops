import { AiConfig } from '@openops/shared';
import { CoreMessage, LanguageModel, TextPart, ToolCallPart } from 'ai';
import { ServerResponse } from 'node:http';
import { MCPChatContext } from './ai-chat.service';

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

export type ChatProcessingContext = {
  aiConfig: AiConfig;
  newMessage: CoreMessage;
  conversation: Conversation;
  languageModel: LanguageModel;
};

export type Conversation = {
  chatContext: MCPChatContext;
  chatHistory: CoreMessage[];
};
