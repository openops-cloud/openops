import { isLLMTelemetryEnabled } from '@openops/common';
import { logger } from '@openops/server-shared';
import { AiConfig, ChatFlowContext } from '@openops/shared';
import { generateObject, LanguageModel, ModelMessage, ToolSet } from 'ai';
import { z } from 'zod';
import { buildUIContextSection } from '../chat/prompts.service';
import { QueryClassification, QueryTypes } from './types';

const MAX_SELECTED_TOOLS = 128;

export type ToolsAndQueryResult = {
  tools?: ToolSet;
  queryClassification: QueryTypes[];
};

export async function selectToolsAndClasifyQuery({
  messages,
  tools,
  languageModel,
  aiConfig,
  uiContext,
}: {
  messages: ModelMessage[];
  tools: ToolSet;
  languageModel: LanguageModel;
  aiConfig: AiConfig;
  uiContext?: ChatFlowContext;
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
    const { object: selectionResult } = await generateObject({
      model: languageModel,
      schema: z.object({
        tool_names: z.array(z.string()),
        query_classification: z
          .array(
            z.enum([
              QueryClassification.analytics,
              QueryClassification.tables,
              QueryClassification.openops,
              QueryClassification.aws_cost,
              QueryClassification.general,
            ]),
          )
          .describe(
            'Array of classifications for the user query (a query can qualify for multiple categories): ' +
              `${QueryClassification.analytics} - requires data visualization, charts, dashboards, or Superset-related functionality; ` +
              `${QueryClassification.tables} - requires database access, schema information, or table operations; ` +
              `${QueryClassification.openops} - requires OpenOps-specific functionality like flows, runs, connections; ` +
              `${QueryClassification.aws_cost} - involves AWS cost analysis, pricing information, or cost optimization; ` +
              `${QueryClassification.general} - general queries that don't fit the above categories. ` +
              'Include all relevant categories that apply to the query.',
          ),
      }),
      system: getSystemPrompt(toolList, uiContext),
      messages,
      ...aiConfig.modelSettings,
      experimental_telemetry: { isEnabled: isLLMTelemetryEnabled() },
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
    logger.error('Error selecting tools and query classification', { error });
    return {
      tools: undefined,
      queryClassification: [QueryClassification.general],
    };
  }
}

const getSystemPrompt = (
  toolList: Array<{ name: string; description: string }>,
  uiContext?: ChatFlowContext,
): string => {
  const toolsMessage = toolList
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n');
  return (
    "Given the following conversation history and the list of available tools, select the tools that are most relevant to answer the user's request. " +
    `Default tables in the system: "Business units", "Tag-Owner mapping", "Idle EBS Volumes to delete", "Auto EC2 instances shutdown", "Resource BU tag assignment", "Opportunities", "Aggregated Costs", "Known cost types by application", "Auto instances shutdown" ` +
    `IMPORTANT: Tables tools should always be included in the output if the user asks a question involving those table names!` +
    "Additionally, classify the user's query into one or more of the provided categories. A single query can qualify for multiple categories. " +
    'Include ALL relevant categories that apply to the query. ' +
    `${uiContext ? `${buildUIContextSection(uiContext)}\n` : ''}
    "Tools: ${toolsMessage}` +
    'Return both the selected tool names and the array of query classifications.'
  );
};
