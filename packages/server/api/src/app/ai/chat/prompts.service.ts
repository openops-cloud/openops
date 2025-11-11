import { AppSystemProp, logger, system } from '@openops/server-shared';
import { ChatFlowContext, CODE_BLOCK_NAME, isNil } from '@openops/shared';
import { ToolSet } from 'ai';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { hasToolProvider } from '../mcp/tool-utils';
import { QueryClassification } from '../mcp/types';
import { MCPChatContext } from './ai-chat.service';

export const getMcpSystemPrompt = async ({
  queryClassification,
  selectedTools,
  allTools,
  uiContext,
}: {
  queryClassification: QueryClassification[];
  selectedTools: ToolSet | undefined;
  allTools: ToolSet;
  uiContext?: ChatFlowContext;
}): Promise<string> => {
  const promptsToLoad = ['mcp.txt'];

  if (
    queryClassification.includes(QueryClassification.tables) &&
    hasToolProvider(selectedTools, 'tables')
  ) {
    promptsToLoad.push('mcp-tables.txt');
  }

  if (
    queryClassification.includes(QueryClassification.analytics) &&
    hasToolProvider(selectedTools, 'superset')
  ) {
    promptsToLoad.push('mcp-analytics.txt');
  }

  if (
    queryClassification.includes(QueryClassification.openops) &&
    hasToolProvider(selectedTools, 'openops')
  ) {
    promptsToLoad.push('mcp-openops.txt');
  }

  if (
    queryClassification.includes(QueryClassification.aws_cost) &&
    !hasToolProvider(allTools, 'aws-pricing') &&
    !hasToolProvider(allTools, 'cost-explorer') &&
    !hasToolProvider(allTools, 'billing-cost-management')
  ) {
    promptsToLoad.push('mcp-aws-cost-unavailable.txt');
  }

  const promptPromises = promptsToLoad.map(loadPrompt);

  if (uiContext) {
    promptPromises.push(buildUIContextSection(uiContext));
  }

  const allPrompts = await Promise.all(promptPromises);

  return allPrompts.join('\n\n');
};

export const getBlockSystemPrompt = async (
  context: MCPChatContext,
  enrichedContext?: ChatFlowContext,
): Promise<string> => {
  switch (context.blockName) {
    case '@openops/block-aws':
      return loadPrompt('aws-cli.txt');
    case '@openops/block-azure':
      return loadPrompt('azure-cli.txt');
    case '@openops/block-google-cloud':
      if (context.actionName === 'google_execute_sql_query') {
        return loadPrompt('gcp-big-query.txt');
      }
      return loadPrompt('gcp-cli.txt');
    case '@openops/block-aws-athena':
      return loadPrompt('aws-athena.txt');
    case '@openops/block-snowflake':
      return loadPrompt('snowflake.txt');
    case '@openops/block-databricks':
      return loadPrompt('databricks.txt');
    case '@openops/block-cloudformation':
      return loadPrompt('cloudformation.txt');
    case CODE_BLOCK_NAME: {
      let enhancedPrompt = '';

      if (
        enrichedContext?.steps?.some(
          (s) => s.variables && s.variables.length > 0,
        )
      ) {
        enhancedPrompt += `
        \n\n ## Inputs properties and sample values:\n${JSON.stringify(
          enrichedContext.steps.map((s) =>
            s.variables?.map((v) => ({
              [`inputs.${v.name}`]: v.value,
            })),
          ),
        )}\n\n`;
      }

      if (!isNil(enrichedContext?.currentStepData)) {
        enhancedPrompt += `
        ## Current output: ${JSON.stringify(enrichedContext.currentStepData)}
        If there is any error in the output, you need to fix the previous code.
        \n\n`;
      }

      const basePrompt = await loadPrompt('code.txt');
      return `${basePrompt} ${enhancedPrompt}`;
    }
    default:
      return '';
  }
};

export const buildUIContextSection = async (
  flowContext: ChatFlowContext,
): Promise<string> => {
  const contextParts: string[] = [];

  if (!flowContext.flowId && !flowContext.flowVersionId && !flowContext.runId) {
    return '';
  }

  if (flowContext.flowId) {
    contextParts.push(`flow ${flowContext.flowId}`);
  }

  if (flowContext.flowVersionId) {
    contextParts.push(`flowVersion ${flowContext.flowVersionId}`);
  }

  if (flowContext.runId) {
    contextParts.push(`run ${flowContext.runId}`);
  }

  if (flowContext.currentStepId) {
    contextParts.push(`step id ${flowContext.currentStepId}`);
  }

  if (flowContext.currentStepName) {
    contextParts.push(`step name "${flowContext.currentStepName}"`);
  }

  if (contextParts.length === 0) {
    return '';
  }

  return (
    `## Current selected data: \n${contextParts.join(' with ')}. \n\n` +
    'If the user is asking about anything related to this data, always use it query tools like Get latest flow version by id or run details tool in order to help him.'
  );
};

export async function loadPrompt(filename: string): Promise<string> {
  const promptsLocation = system.get<string>(AppSystemProp.AI_PROMPTS_LOCATION);

  if (promptsLocation) {
    const prompt = await loadFromCloud(promptsLocation, filename);
    return prompt || loadFromFile(filename);
  }

  return loadFromFile(filename);
}

async function loadFromFile(filename: string): Promise<string> {
  const projectRoot = process.cwd();

  const filePath = join(projectRoot, 'ai-prompts', filename);

  return readFile(filePath, 'utf-8');
}

async function loadFromCloud(
  promptsLocation: string,
  filename: string,
): Promise<string> {
  const slash = promptsLocation.endsWith('/') ? '' : '/';
  const promptFile = `${promptsLocation}${slash}${filename}`;

  try {
    const response = await fetch(promptFile);
    if (!response.ok) {
      logger.error(`Failed to fetch prompt '${promptFile}' from cloud.`, {
        statusText: response.statusText,
        promptFile,
      });
      return '';
    }
    return await response.text();
  } catch (error) {
    logger.error(`Failed to fetch prompt '${promptFile}' from cloud.`, {
      error,
      promptFile,
    });
    return '';
  }
}
