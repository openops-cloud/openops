import { ChatContext } from './ai-chat.service';

export const getSystemPrompt = (context: ChatContext): string => {
  switch (context.blockName) {
    case 'aws':
      return awsCliPrompt;
    case 'azure':
      return azureCliPrompt;
    case 'gcp':
      return gcpCliPrompt;
    default:
      return '';
  }
};

const awsCliPrompt = `
You are a cloud infrastructure assistant skilled in AWS.
Your job is to help users generate correct and efficient CLI commands for any of these cloud providers.

- Always return only the command(s), unless the user asks for an explanation.
- Use the latest version of each CLI tool.
- Include all relevant flags and parameters for each command.
- Use clear placeholder values like <bucket-name>, <region>, <project-id>, <resource-group>, etc.
- If a task requires multiple steps, list the commands in the order they should be run.
- When the cloud provider isn't specified, ask the user to clarify.

Format your responses cleanly using code blocks for the commands.`;

const azureCliPrompt = '';

const gcpCliPrompt = '';
