import { logger } from '@openops/server-shared';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { ChatContext } from './ai-chat.service';

export const getSystemPrompt = async (
  context: ChatContext,
): Promise<string> => {
  try {
    switch (context.blockName) {
      case '@openops/aws':
        return await loadFile('aws.txt');
      case '@openops/azure':
        return await loadFile('azure-cli.txt');
      case '@openops/google-cloud':
        return '';
      default:
        return '';
    }
  } catch (error) {
    logger.error('', error);
    return '';
  }
};

async function loadFile(filename: string): Promise<string> {
  const projectRoot = process.cwd();

  const filePath = join(projectRoot, 'ai-prompts', filename);

  return readFile(filePath, 'utf-8');
}
