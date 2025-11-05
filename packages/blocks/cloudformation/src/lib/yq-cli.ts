import { CommandResult, executeCommand, useTempFile } from '@openops/common';
import { logger } from '@openops/server-shared';

export async function updateResourceProperties(
  template: string,
  logicalId: string,
  modifications: { propertyName: string; propertyValue: string }[],
): Promise<string> {
  const providedTemplate = template.trim() as string;

  const isJson = providedTemplate.startsWith('{');

  const result = await useTempFile(providedTemplate, async (filePath) => {
    const updates = [];
    for (const modification of modifications) {
      const propertyName = modification.propertyName;
      const propertyValue =
        typeof modification.propertyValue === 'string'
          ? modification.propertyValue
          : JSON.stringify(modification.propertyValue);

      updates.push(
        `.Resources.${logicalId}.Properties.${propertyName} =c ${propertyValue} | .Resources.${logicalId}.Properties.${propertyName} style=""`,
      );
    }

    const result = await updateTemplateCommand(filePath, updates, isJson);

    return result;
  });

  return result;
}

export interface CloudformationResource {
  logicalId: string;
  type: string;
}

export async function getResourcesLogicalId(
  template: string,
): Promise<CloudformationResource[]> {
  const commandResult = await useTempFile(template, async (filePath) => {
    return await executeYQCommand(
      `-o=json '.' ${filePath} | yq '.Resources | to_entries | .[] | .key + ", " + .value.Type'`,
    );
  });

  if (
    !commandResult ||
    commandResult.exitCode !== 0 ||
    commandResult.stdError
  ) {
    logger.warn('Failed to execute command to get resources logical id.', {
      commandResult,
    });
    throw new Error('Failed to execute command to get resources logical id.');
  }

  if (!commandResult.stdOut || commandResult.stdOut.trim() === '') {
    return [];
  }

  const resources = commandResult.stdOut.split('\n').map((line) => {
    const [logicalId, type] = line.split(',').map((value) => value.trim());

    return {
      logicalId: logicalId,
      type: type,
    };
  });

  return resources;
}

export async function deleteResource(
  template: string,
  logicalId: string,
): Promise<string> {
  const providedTemplate = template.trim() as string;

  const isJson = providedTemplate.startsWith('{');

  const result = await useTempFile(providedTemplate, async (filePath) => {
    const output = isJson ? 'json' : 'yaml';

    const command = `-i 'del(.Resources.${logicalId})' ${filePath} -o=${output} && yq '.' ${filePath} -o=${output}`;

    const commandResult = await executeYQCommand(command);

    if (commandResult.exitCode !== 0 || commandResult.stdError) {
      logger.warn('Failed to modify the template.', { commandResult });
      throw new Error(
        `Failed to modify the template. ${JSON.stringify(commandResult)}`,
      );
    }

    return commandResult.stdOut;
  });

  return result;
}

async function updateTemplateCommand(
  filePath: string,
  modifications: string[],
  isJson: boolean,
): Promise<string> {
  const output = isJson ? 'json' : 'yaml';

  const command = `-i '${modifications.join(
    ' | ',
  )}' ${filePath} -o=${output} && yq '.' ${filePath} -o=${output}`;

  const commandResult = await executeYQCommand(command);

  if (commandResult.exitCode !== 0 || commandResult.stdError) {
    logger.warn('Failed to modify the template.', { commandResult });
    throw new Error(
      `Failed to modify the template. ${JSON.stringify(commandResult)}`,
    );
  }

  return commandResult.stdOut;
}

async function executeYQCommand(parameters: string): Promise<CommandResult> {
  return await executeCommand('/bin/bash', ['-c', `yq ${parameters}`]);
}
