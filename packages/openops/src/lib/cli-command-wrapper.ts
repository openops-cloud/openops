import { logger } from '@openops/server-shared';
import { parse } from 'shell-quote';
import { CommandResult, executeFile } from './command-wrapper';

export function convertMultilineToSingleLine(command: string): string {
  return command
    .replace(/\\\s*\n/g, ' ')
    .replace(/("[^"]*"|'[^']*')|\s+/g, (match, quoted) =>
      quoted ? quoted : ' ',
    )
    .trim();
}

async function executeCliCommand(
  command: string,
  cliTool: string,
  envVars?: Record<string, string>,
): Promise<CommandResult> {
  const preprocessedCommand = convertMultilineToSingleLine(command);
  let args = parse(preprocessedCommand);

  if ((args[0] as string).toLowerCase() === cliTool) {
    args = args.slice(1);
  }

  return await executeFile(cliTool, args as string[], envVars);
}

export async function runCliCommand(
  command: string,
  cliTool: string,
  envVars?: Record<string, string>,
): Promise<string> {
  const commandResult = await executeCliCommand(command, cliTool, envVars);

  if (!commandResult || commandResult.exitCode !== 0) {
    logger.error(`Failed to run the ${cliTool} command.`, commandResult);
    throw new Error(
      `Failed to run the ${cliTool} command: '${command}'. Error: ${JSON.stringify(
        commandResult,
      )}`,
    );
  }

  return commandResult.stdOut;
}
