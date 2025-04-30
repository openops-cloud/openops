import { logger } from '@openops/server-shared';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { ChatContext } from './ai-chat.service';

export const getSystemPrompt = async (
  context: ChatContext,
): Promise<string> => {
  try {
    switch (context.blockName) {
      case '@openops/block-aws':
        return await loadFile('aws-cli.txt');
      case '@openops/block-azure':
        return await loadFile('azure-cli.txt');
      case '@openops/block-google-cloud':
        return await loadFile('gcp-cli.txt');
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
