import { CommandResult, executeCommand, useTempFile } from '@openops/common';
import { logger } from '@openops/server-shared';

const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]+$/;

function validateIdentifier(value: string, fieldName: string): void {
  if (!value || !SAFE_IDENTIFIER_PATTERN.test(value)) {
    throw new Error(
      `${fieldName} contains invalid characters. Only alphanumeric, underscore, and hyphen are allowed.`,
    );
  }
}

function escapeShellArgument(value: string): string {
  const escaped = value.replace(/'/g, "'\\''");
  return `'${escaped}'`;
}

function escapePropertyValueAsJson(propertyValue: string): string {
  return JSON.stringify(propertyValue);
}

export async function updateResourceProperties(
  template: string,
  logicalId: string,
  modifications: { propertyName: string; propertyValue: string }[],
): Promise<string> {
  validateIdentifier(logicalId, 'Logical ID');

  modifications.forEach((modification, index) => {
    validateIdentifier(
      modification.propertyName,
      `Property name at index ${index}`,
    );
  });

  const providedTemplate = template.trim() as string;

  const isJson = providedTemplate.startsWith('{');

  const result = await useTempFile(providedTemplate, async (filePath) => {
    const updates = [];
    for (const modification of modifications) {
      const propertyName = modification.propertyName;
      const propertyValueLiteral = escapePropertyValueAsJson(
        modification.propertyValue,
      );

      updates.push(
        `.Resources.${logicalId}.Properties.${propertyName} =c ${propertyValueLiteral} | .Resources.${logicalId}.Properties.${propertyName} style=""`,
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
    const escapedFilePath = escapeShellArgument(filePath);
    const expression = escapeShellArgument(
      '.Resources | to_entries | .[] | .key + ", " + .value.Type',
    );
    return await executeYQCommand(
      `-o=json '.' ${escapedFilePath} | yq ${expression}`,
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
  validateIdentifier(logicalId, 'Logical ID');

  const providedTemplate = template.trim() as string;

  const isJson = providedTemplate.startsWith('{');

  const result = await useTempFile(providedTemplate, async (filePath) => {
    const output = isJson ? 'json' : 'yaml';
    const escapedFilePath = escapeShellArgument(filePath);
    const deleteExpression = escapeShellArgument(
      `del(.Resources.${logicalId})`,
    );

    const command = `-i ${deleteExpression} ${escapedFilePath} -o=${output} && yq '.' ${escapedFilePath} -o=${output}`;

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
  const escapedFilePath = escapeShellArgument(filePath);
  const expression = escapeShellArgument(modifications.join(' | '));

  const command = `-i ${expression} ${escapedFilePath} -o=${output} && yq '.' ${escapedFilePath} -o=${output}`;

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
