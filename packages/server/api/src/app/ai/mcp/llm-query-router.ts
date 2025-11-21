import {
  getDatabaseTableNames,
  getTableNames,
  isLLMTelemetryEnabled,
} from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AiConfigParsed, ChatFlowContext } from '@openops/shared';
import { generateObject, LanguageModel, ModelMessage, ToolSet } from 'ai';
import { z } from 'zod';
import { projectService } from '../../project/project-service';
import { getChatTools } from '../chat/ai-chat.service';
import { buildUIContextSection } from '../chat/prompts.service';
import { getAdditionalQueryClassificationDescriptions } from './extensions';
import { sanitizeMessages } from './tool-utils';
import { QueryClassification } from './types';

const MAX_SELECTED_TOOLS = 128;

export type ToolsAndQueryResult = {
  tools?: ToolSet;
  queryClassification: QueryClassification[];
  reasoning?: string;
  selectedToolNames: string[];
};

const baseQueryClassificationDescriptions: Record<QueryClassification, string> =
  {
    [QueryClassification.analytics]:
      'requires data visualization, charts, dashboards, or Superset-related functionality',
    [QueryClassification.tables]:
      'requires database access, schema information, or table operations',
    [QueryClassification.openops]:
      'requires OpenOps-specific functionality like flows, runs, connections',
    [QueryClassification.aws_cost]:
      'involves AWS cost analysis, pricing information, or cost optimization',
    [QueryClassification.general]:
      "general queries that don't fit the other categories",
  };

const queryClassificationDescriptions: Record<string, string> = {
  ...baseQueryClassificationDescriptions,
  ...getAdditionalQueryClassificationDescriptions(),
};

const createQueryClassificationSchema = (): z.ZodUnion<
  z.ZodLiteral<QueryClassification>[]
> => {
  const schemas = Object.values(QueryClassification).map((value) =>
    z.literal(value).describe(queryClassificationDescriptions[value]),
  );
  return z.union(schemas);
};

const queryClassificationUnionSchema = createQueryClassificationSchema();

const coreWithReasoningSchema = z.object({
  reasoning: z
    .string()
    .describe(
      'The reasoning for the tool selection and classification. Fill this field first',
    ),
  user_facing_reasoning: z
    .string()
    .describe(
      'Short non-technical description to show the next steps to the user',
    ),
  tool_names: z.array(z.string()).describe('Array of selected tool names'),
  query_classification: z
    .array(queryClassificationUnionSchema)
    .describe('Array of query classification categories'),
});

export async function routeQuery({
  messages,
  tools,
  languageModel,
  aiConfig,
  uiContext,
  abortSignal,
  userId,
  chatId,
  projectId,
}: {
  messages: ModelMessage[];
  tools: ToolSet;
  languageModel: LanguageModel;
  aiConfig: AiConfigParsed;
  uiContext?: ChatFlowContext;
  abortSignal?: AbortSignal;
  userId: string;
  chatId: string;
  projectId: string;
}): Promise<ToolsAndQueryResult> {
  const previousTools = await getPreviousToolsForChat(
    userId,
    chatId,
    projectId,
  );

  if (!tools || Object.keys(tools).length === 0) {
    return {
      tools: undefined,
      queryClassification: [QueryClassification.general],
      reasoning: undefined,
      selectedToolNames: previousTools,
    };
  }

  const toolList = Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description || '',
  }));

  try {
    const openopsTablesNames = await getOpenOpsTablesNames(projectId);

    const { object: selectionResult } = await generateObject({
      model: languageModel,
      schema: coreWithReasoningSchema,
      system: await getSystemPrompt(toolList, openopsTablesNames, uiContext),
      messages: sanitizeMessages(messages),
      ...aiConfig.modelSettings,
      experimental_telemetry: { isEnabled: isLLMTelemetryEnabled() },
      experimental_repairText: async ({ text }) => repairText(text),
      abortSignal,
    });

    let selectedToolNames = selectionResult.tool_names;
    const queryClassification = selectionResult.query_classification;

    const validToolNames = Object.keys(tools);
    const invalidToolNames = selectedToolNames.filter(
      (name) => !validToolNames.includes(name),
    );

    if (invalidToolNames.length > 0) {
      selectedToolNames = selectedToolNames.filter((name) =>
        validToolNames.includes(name),
      );
    }

    const mergedToolNames = Array.from(
      new Set([...previousTools, ...selectedToolNames]),
    ).filter((name) => validToolNames.includes(name));

    const selectedTools = Object.fromEntries(
      Object.entries(tools)
        .filter(([name]) => mergedToolNames.includes(name))
        .slice(0, MAX_SELECTED_TOOLS),
    );

    return {
      queryClassification,
      tools: selectedTools,
      reasoning: selectionResult.user_facing_reasoning,
      selectedToolNames: mergedToolNames,
    };
  } catch (error) {
    const isAbortError = error instanceof Error && error.name === 'AbortError';
    if (!isAbortError) {
      logger.error('Error selecting tools and query classification', { error });
    }
    return {
      tools: undefined,
      queryClassification: [QueryClassification.general],
      reasoning: undefined,
      selectedToolNames: previousTools,
    };
  }
}

const getPreviousToolsForChat = async (
  userId: string,
  chatId: string,
  projectId: string,
): Promise<string[]> => {
  try {
    const tools = await getChatTools(chatId, userId, projectId);
    return tools || [];
  } catch (error) {
    logger.error('Error fetching previous chat tools', { error });
    return [];
  }
};

const getOpenOpsTablesNames = async (projectId: string): Promise<string[]> => {
  try {
    const useDatabaseToken =
      system.getBoolean(AppSystemProp.USE_DATABASE_TOKEN) ?? false;

    if (useDatabaseToken) {
      const project = await projectService.getOneOrThrow(projectId);
      return await getDatabaseTableNames(
        project.tablesDatabaseId,
        project.tablesDatabaseToken,
      );
    } else {
      return await getTableNames();
    }
  } catch (error) {
    logger.error('Error getting OpenOps table names for the LLM query router', {
      error,
    });
    return [];
  }
};

const getSystemPrompt = async (
  toolList: Array<{ name: string; description: string }>,
  openopsTablesNames: string[],
  uiContext?: ChatFlowContext,
): Promise<string> => {
  const toolsMessage = toolList
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n');
  return (
    "Given the following conversation history and the list of available tools, select the tools that are most relevant to answer the user's request. " +
    `IMPORTANT: Tables tools should always be included in the output if the user asks a question involving those table names: ${openopsTablesNames.join(
      ', ',
    )}. ` +
    "Classify the user's prompt into one or more of the provided categories. A single prompt can qualify for multiple categories. " +
    'Include ALL relevant categories that apply. ' +
    `${
      uiContext ? `${await buildUIContextSection(uiContext)}\n` : ''
    } Tools: ${toolsMessage}`
  );
};

/**
 * Finds the first key in an object and returns its value.
 * Returns undefined if the key is not found.
 * @param obj - The object to search in.
 * @param targetKey - The key to search for.
 * @returns The value of the first key in the object.
 */
function findFirstKeyInObject(
  obj: Record<string, unknown>,
  targetKey: string,
): unknown {
  for (const key in obj) {
    if (key === targetKey) {
      return obj[key];
    }

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const result: unknown = findFirstKeyInObject(
        obj[key] as Record<string, unknown>,
        targetKey,
      );
      if (result !== undefined) {
        return result;
      }
    }
  }

  return undefined;
}

/**
 * Attempts to repair a malformed JSON string by extracting the expected schema fields.
 * Returns null if the input cannot be parsed or repaired, so then ai sdk will throw an error.
 */
const repairText = (text: string): string | null => {
  try {
    const parsedText = JSON.parse(text);

    return JSON.stringify({
      tool_names: findFirstKeyInObject(parsedText, 'tool_names') || [],
      query_classification:
        findFirstKeyInObject(parsedText, 'query_classification') || [],
      reasoning: findFirstKeyInObject(parsedText, 'reasoning') || '',
      user_facing_reasoning:
        findFirstKeyInObject(parsedText, 'user_facing_reasoning') || '',
    });
  } catch (error) {
    return null;
  }
};
