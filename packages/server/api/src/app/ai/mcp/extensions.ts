import { LanguageModel, ModelMessage, ToolSet } from 'ai';
import { QueryClassification } from './types';

export function getAdditionalQueryClassificationDescriptions(): Record<
  string,
  string
> {
  return {};
}

export async function getAdditionalTools({
  queryClassification,
  tools,
  languageModel,
  context,
}: {
  queryClassification: QueryClassification[];
  tools: ToolSet;
  languageModel: LanguageModel;
  context: {
    userId: string;
    chatId: string;
    projectId: string;
  };
}): Promise<ToolSet> {
  return {};
}

export async function enhanceSystemPrompt({
  basePrompt,
  queryClassification,
  hasTools,
  context,
}: {
  basePrompt: string;
  queryClassification: QueryClassification[];
  hasTools: boolean;
  context: {
    userId: string;
    chatId: string;
    projectId: string;
  };
}): Promise<string> {
  return basePrompt;
}

export async function processTools({
  tools,
  selectedToolNames,
  queryClassification,
  context,
}: {
  tools: ToolSet;
  selectedToolNames: string[];
  queryClassification: QueryClassification[];
  context: {
    userId: string;
    chatId: string;
    projectId: string;
  };
}): Promise<{
  tools: ToolSet;
  selectedToolNames: string[];
}> {
  return { tools, selectedToolNames };
}

export async function beforeToolRouting({
  messages,
  context,
}: {
  messages: ModelMessage[];
  context: {
    userId: string;
    chatId: string;
    projectId: string;
  };
}): Promise<void> {
  // No-op in base implementation
}
