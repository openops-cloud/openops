import { AppSystemProp, logger, system } from '@openops/server-shared';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { ChatContext } from './ai-chat.service';

export const getSystemPrompt = async (
  context: ChatContext,
): Promise<string> => {
  switch (context.blockName) {
    case '@openops/block-aws':
      return loadWithBasePrompt('aws-cli.txt');
    case '@openops/block-azure':
      return loadWithBasePrompt('azure-cli.txt');
    case '@openops/block-google-cloud':
      return loadWithBasePrompt('gcp-cli.txt');
    default:
      return '';
  }
};

async function loadWithBasePrompt(promptFile: string): Promise<string> {
  const basePrompt = await loadPrompt('base-cli.txt');
  const customPrompt = await loadPrompt(promptFile);

  return `${basePrompt} \n ${customPrompt}`;
}

async function loadPrompt(filename: string): Promise<string> {
  const promptsLocation = system.get<string>(
    AppSystemProp.INTERNAL_PROMPTS_LOCATION,
  );

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

  const response = await fetch(promptFile);
  if (!response.ok) {
    logger.error('Failed to fetch prompt file.', {
      statusText: response.statusText,
      promptFile,
    });
    return '';
  }

  return response.text();
}
