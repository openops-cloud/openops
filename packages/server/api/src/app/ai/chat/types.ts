import { AiConfigParsed } from '@openops/shared';
import { LanguageModel, ModelMessage, TextPart, ToolCallPart } from 'ai';
import { ServerResponse } from 'node:http';
import { MCPChatContext } from './ai-chat.service';

export type ToolCallPartWithResult = {
  output?: unknown;
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
  aiConfig: AiConfigParsed;
  newMessage: ModelMessage;
  conversation: Conversation;
  languageModel: LanguageModel;
};

export type Conversation = {
  chatContext: MCPChatContext;
  chatHistory: ModelMessage[];
};
