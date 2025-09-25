import { AiConfig } from '@openops/shared';
import {
  CoreMessage,
  LanguageModel,
  ModelMessage,
  TextPart,
  ToolCallPart,
  UIMessage,
} from 'ai';
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
  aiConfig: AiConfig;
  newMessage: UIMessage;
  conversation: Conversation;
  languageModel: LanguageModel;
};

export type ChatHistory = {
  messages: UIMessage[];
  activeStreamId?: string | null;
};

export type Conversation = {
  chatContext: MCPChatContext;
  chatHistory: ChatHistory;
};
