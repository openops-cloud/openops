import { AppSystemProp, logger, system } from '@openops/server-shared';
import { ChatContext } from './ai-chat.service';

export const getSystemPrompt = async (
  context: ChatContext,
): Promise<string> => {
  switch (context.blockName) {
    case '@openops/block-aws':
      return loadFile('aws-cli.txt');
    case '@openops/block-azure':
      return loadFile('azure-cli.txt');
    case '@openops/block-google-cloud':
      return loadFile('gcp-cli.txt');
    default:
      return '';
  }
};

async function loadFile(filename: string): Promise<string> {
  const promptsLocation = system.getOrThrow<string>(
    AppSystemProp.INTERNAL_PROMPTS_LOCATION,
  );
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
