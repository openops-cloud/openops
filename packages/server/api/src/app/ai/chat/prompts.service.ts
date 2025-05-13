import { AppSystemProp, logger, system } from '@openops/server-shared';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { ChatContext } from './ai-chat.service';

export const getMcpSystemPrompt = async (): Promise<string> => {
  return loadPrompt('mcp.txt');
};

export const getSystemPrompt = async (
  context: ChatContext,
): Promise<string> => {
  switch (context.blockName) {
    case '@openops/block-aws':
      return loadPrompt('aws-cli.txt');
    case '@openops/block-azure':
      return loadPrompt('azure-cli.txt');
    case '@openops/block-google-cloud':
      return loadPrompt('gcp-cli.txt');
    case '@openops/block-aws-athena':
      return loadPrompt('aws-athena.txt');
    case '@openops/block-snowflake':
      return loadPrompt('snowflake.txt');
    default:
      return '';
  }
};

async function loadPrompt(filename: string): Promise<string> {
  const promptsLocation = system.get<string>(AppSystemProp.AI_PROMPTS_LOCATION);

  if (promptsLocation) {
    return loadFromCloud(promptsLocation, filename);
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
      logger.error('Failed to fetch prompt file.', {
        statusText: response.statusText,
        promptFile,
      });
      return '';
    }
    return await response.text();
  } catch (error) {
    logger.error('Failed to fetch prompt file.', error);
    return '';
  }
}
