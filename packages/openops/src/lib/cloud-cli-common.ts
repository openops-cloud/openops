import { logger } from '@openops/server-shared';

export function tryParseJson(result: string): any {
  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
}

export function handleCliError({
  provider,
  command,
  error,
}: {
  provider: string;
  command: string;
  error: unknown;
}): never {
  logger.error(`${provider} CLI execution failed.`, {
    command,
    error,
  });

  const message = `An error occurred while running a ${provider} CLI command: ${error}`;

  throw new Error(message);
}
