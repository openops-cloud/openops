import { Property } from '@openops/blocks-framework';
import { logger, SharedSystemProp, system } from '@openops/server-shared';

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

  const message = `An error occurred while running ${provider} CLI command: ${error}`;

  throw new Error(message);
}

export function getUseHostSessionProperty(
  cloudProvider: string,
  loginCommand: string,
) {
  return Property.DynamicProperties({
    displayName: '',
    required: true,
    refreshers: [],
    props: async () => {
      const enableHostSession = system.getBoolean(
        SharedSystemProp.ENABLE_HOST_SESSION,
      );

      if (!enableHostSession) {
        return {};
      }

      const result: any = {
        useHostSessionCheckbox: Property.Checkbox({
          displayName: `Use host machine ${cloudProvider} CLI session`,
          description: `(Advanced) Uses the host machine's ${cloudProvider} CLI session. Requires '${loginCommand}' to have been run on the machine.`,
          required: false,
        }),
      };

      return result;
    },
  });
}
