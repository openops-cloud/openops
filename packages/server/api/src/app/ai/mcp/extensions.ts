import { AiConfigParsed, ChatFlowContext } from '@openops/shared';
import { LanguageModel, ModelMessage, ToolSet } from 'ai';
import { QueryClassification } from './types';

/**
 * Extension point for providing additional query classification descriptions.
 * Internal/enterprise builds can override this to add custom classifications.
 */
export function getAdditionalQueryClassificationDescriptions(): Record<
  string,
  string
> {
  return {};
}

/**
 * Extension point for providing additional tools based on query classification.
 * Internal/enterprise builds can override this to inject custom tools.
 */
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

/**
 * Extension point for modifying the system prompt.
 * Internal/enterprise builds can override this to enhance the prompt.
 */
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

/**
 * Extension point for processing tools before they are used.
 * Internal/enterprise builds can override this to add wrappers, filters, etc.
 */
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

/**
 * Extension point for initialization logic before tool routing.
 * Internal/enterprise builds can override this for setup tasks.
 */
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
