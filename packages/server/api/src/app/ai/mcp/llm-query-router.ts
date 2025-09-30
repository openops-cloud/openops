import { getTableNames, isLLMTelemetryEnabled } from '@openops/common';
import { logger } from '@openops/server-shared';
import { AiConfigParsed, ChatFlowContext } from '@openops/shared';
import { generateObject, LanguageModel, ModelMessage, ToolSet } from 'ai';
import { z } from 'zod';
import { buildUIContextSection } from '../chat/prompts.service';
import { QueryClassification } from './types';

const MAX_SELECTED_TOOLS = 128;

export type ToolsAndQueryResult = {
  tools?: ToolSet;
  queryClassification: QueryClassification[];
};

const queryClassificationDescriptions: Record<QueryClassification, string> = {
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

const createQueryClassificationSchema = (): z.ZodUnion<
  z.ZodLiteral<QueryClassification>[]
> => {
  const schemas = Object.values(QueryClassification).map((value) =>
    z.literal(value).describe(queryClassificationDescriptions[value]),
  );
  return z.union(schemas);
};

const queryClassificationUnionSchema = createQueryClassificationSchema();

const coreSchema = z.object({
  tool_names: z.array(z.string()),
  query_classification: z.array(queryClassificationUnionSchema),
});

const coreWithReasoningSchema = z.object({
  reasoning: z
    .string()
    .describe(
      'The reasoning for the tool selection and classification. Fill this field first',
    ),
  actualResult: coreSchema,
});

export async function routeQuery({
  messages,
  tools,
  languageModel,
  aiConfig,
  uiContext,
  abortSignal,
}: {
  messages: ModelMessage[];
  tools: ToolSet;
  languageModel: LanguageModel;
  aiConfig: AiConfigParsed;
  uiContext?: ChatFlowContext;
  abortSignal?: AbortSignal;
}): Promise<ToolsAndQueryResult> {
  if (!tools || Object.keys(tools).length === 0) {
    return {
      tools: undefined,
      queryClassification: [QueryClassification.general],
    };
  }

  const toolList = Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description || '',
  }));

  try {
    const openopsTablesNames = await getTableNames();

    const {
      object: { actualResult: selectionResult },
    } = await generateObject({
      model: languageModel,
      schema: coreWithReasoningSchema,
      system: getSystemPrompt(toolList, openopsTablesNames, uiContext),
      messages,
      ...aiConfig.modelSettings,
      experimental_telemetry: { isEnabled: isLLMTelemetryEnabled() },
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

    const selectedTools = Object.fromEntries(
      Object.entries(tools)
        .filter(([name]) => selectedToolNames.includes(name))
        .slice(0, MAX_SELECTED_TOOLS),
    );

    return {
      queryClassification,
      tools: selectedTools,
    };
  } catch (error) {
    const isAbortError = error instanceof Error && error.name === 'AbortError';
    if (!isAbortError) {
      logger.error('Error selecting tools and query classification', { error });
    }
    return {
      tools: undefined,
      queryClassification: [QueryClassification.general],
    };
  }
}

const getSystemPrompt = (
  toolList: Array<{ name: string; description: string }>,
  openopsTablesNames: string[],
  uiContext?: ChatFlowContext,
): string => {
  const toolsMessage = toolList
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n');
  return (
    "Given the following conversation history and the list of available tools, select the tools that are most relevant to answer the user's request. " +
    `Default tables in the system: "Business units", "Tag-Owner mapping", "Idle EBS Volumes to delete", "Auto EC2 instances shutdown", "Resource BU tag assignment", "Opportunities", "Aggregated Costs", "Known cost types by application", "Auto instances shutdown" ` +
    `IMPORTANT: Tables tools should always be included in the output if the user asks a question involving those table names: ${openopsTablesNames.join(
      ', ',
    )}. ` +
    "Additionally, classify the user's query into one or more of the provided categories. A single query can qualify for multiple categories. " +
    'Include ALL relevant categories that apply to the query. ' +
    `${uiContext ? `${buildUIContextSection(uiContext)}\n` : ''}
    "Tools: ${toolsMessage}` +
    'Return both the selected tool names and the array of query classifications.'
  );
};
