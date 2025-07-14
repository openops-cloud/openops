import { AppSystemProp, logger, system } from '@openops/server-shared';
import { ChatFlowContext } from '@openops/shared';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { MCPChatContext } from './ai-chat.service';

export const getMcpSystemPrompt = async ({
  isAnalyticsLoaded,
  isTablesLoaded,
  isOpenOpsMCPEnabled,
  isAwsCostMcpDisabled,
}: {
  isAnalyticsLoaded: boolean;
  isTablesLoaded: boolean;
  isOpenOpsMCPEnabled: boolean;
  isAwsCostMcpDisabled: boolean;
}): Promise<string> => {
  const prompts = [loadPrompt('mcp.txt')];

  if (isTablesLoaded) {
    prompts.push(loadPrompt('mcp-tables.txt'));
  }

  if (isAnalyticsLoaded) {
    prompts.push(loadPrompt('mcp-analytics.txt'));
  }

  if (isOpenOpsMCPEnabled) {
    prompts.push(loadPrompt('mcp-openops.txt'));
  }

  if (isAwsCostMcpDisabled) {
    prompts.push(loadPrompt('mcp-aws-cost-unavailable.txt'));
  }

  const allPrompts = await Promise.all(prompts);
  return allPrompts.join('\n\n');
};

export const getBlockSystemPrompt = async (
  context: MCPChatContext,
  enrichedContext?: ChatFlowContext,
): Promise<string> => {
  const enrichedContextString = enrichedContext?.steps?.some((s) => s.variables)
    ? `\n\nAdditional Context:\n${JSON.stringify(
        enrichedContext.steps.map((s) => s.variables),
        null,
        2,
      )}`
    : '';

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
    // wip until the final ticket is implemented
    case '@openops/code':
      return `Generate code with this interface, based on the user's request. The code should be executable in isolated-vm (Secure & isolated JS environments for nodejs).
      It should be robust and easy to read.
      
      // example packages to import (only if needed)
      import x from 'x';
      import y from 'y';
      import z from 'z';

      export const code = async (inputs) => {
      // do transformation logic here
      return ...; };

      If there is some package the user wants to use, or necessary for the processing, also provide a separate package.json file with the dependencies.
      NEVER USE require, use import instead. Keep in mind isolated-vm has no access to any native Node.js modules, such as "fs", "process", "http", "crypto", etc.
      If there are any variables in the following context, use them in the code. If you see inputs variables truncated, keep in mind that the final code will receive the full object as inputs and NOT stringified! Verify both cases, if input variables are objects or strings.
      ${enrichedContextString}`;
    default:
      return '';
  }
};

async function loadPrompt(filename: string): Promise<string> {
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
