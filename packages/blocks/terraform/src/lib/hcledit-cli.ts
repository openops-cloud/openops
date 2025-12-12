import { CommandResult, executeCommand, useTempFile } from '@openops/common';
import { logger } from '@openops/server-shared';
import { escapeAttributeValue } from './modify/attribute-value-formatter';

export interface TerraformResource {
  name: string;
  type: string;
}

const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]+$/;

function validateIdentifier(value: string, fieldName: string): void {
  if (!value || !SAFE_IDENTIFIER_PATTERN.test(value)) {
    throw new Error(
      `${fieldName} contains invalid characters. Only alphanumeric, underscore, and hyphen are allowed.`,
    );
  }
}

/**
 * Escapes a string for safe use as a shell argument.
 *
 * This function wraps the input value in single quotes and escapes any embedded single quotes
 * using the POSIX shell pattern: '\''. This is the standard technique for safely passing
 * arbitrary strings as arguments to POSIX-compliant shells.
 *
 * @param value - The string to escape for the shell.
 * @returns The shell-escaped string.
 */
function escapeShellArgument(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export async function getResources(
  template: string,
): Promise<TerraformResource[]> {
  const commandResult = await useTempFile(template, async (filePath) => {
    return await executeHclEditCommand(
      `-f ${escapeShellArgument(
        filePath,
      )} block get resource | hcledit block list`,
    );
  });

  if (
    !commandResult ||
    commandResult.exitCode !== 0 ||
    commandResult.stdError
  ) {
    logger.warn('Failed to execute the command to get resources.', {
      commandResult,
    });
    throw new Error(
      `Failed to execute the command to get resources. ${JSON.stringify(
        commandResult,
      )}`,
    );
  }

  if (!commandResult.stdOut || commandResult.stdOut.trim() === '') {
    return [];
  }

  const resources = commandResult.stdOut
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [blockType, type, name] = line
        .split('.')
        .map((value) => value.trim());

      if (blockType !== 'resource' || !type || !name) {
        throw new Error(
          `Unexpected resource format received from hcledit. Line: ${line}`,
        );
      }

      validateIdentifier(type, 'Resource type');
      validateIdentifier(name, 'Resource name');

      return {
        name,
        type,
      };
    });

  return resources;
}

export async function updateResourceProperties(
  template: string,
  resourceType: string,
  resourceName: string,
  modifications: {
    propertyName: string;
    propertyValue: string | number | boolean;
  }[],
): Promise<string> {
  validateIdentifier(resourceType, 'Resource type');
  validateIdentifier(resourceName, 'Resource name');

  modifications.forEach((modification, index) => {
    validateIdentifier(
      modification.propertyName,
      `Property name at index ${index}`,
    );
  });

  const providedTemplate = template.trim() as string;

  const result = await useTempFile(providedTemplate, async (filePath) => {
    const updates = [];
    for (const modification of modifications) {
      const propertyName = modification.propertyName;
      const propertyValue = escapeAttributeValue(
        modification.propertyValue,
      ).replace(/"/g, '\\"');

      const attributeCommand = await getAttributeCommand(
        filePath,
        resourceType,
        resourceName,
        propertyName,
      );

      updates.push(
        `attribute ${attributeCommand} resource.${resourceType}.${resourceName}.${propertyName} ${propertyValue}`,
      );
    }

    const result = await updateTemplateCommand(filePath, updates);

    return result;
  });

  return result;
}

export async function updateVariablesFile(
  template: string,
  modifications: { variableName: string; variableValue: unknown }[],
): Promise<string> {
  const providedTemplate = template.trim();

  modifications.forEach((modification, index) => {
    validateIdentifier(
      modification.variableName,
      `Variable name at index ${index}`,
    );
  });

  return await useTempFile(providedTemplate, async (filePath) => {
    const updates = [];

    for (const modification of modifications) {
      const propertyName = modification.variableName;
      const propertyValue = escapeAttributeValue(modification.variableValue);

      updates.push(`attribute set ${propertyName} ${propertyValue}`);
    }

    return await updateTemplateCommand(filePath, updates);
  });
}

export async function deleteResource(
  template: string,
  resourceType: string,
  resourceName: string,
): Promise<string> {
  validateIdentifier(resourceType, 'Resource type');
  validateIdentifier(resourceName, 'Resource name');

  const commandResult = await useTempFile(template, async (filePath) => {
    return await executeHclEditCommand(
      `-f ${escapeShellArgument(
        filePath,
      )} block rm resource.${resourceType}.${resourceName}`,
    );
  });

  if (
    !commandResult ||
    commandResult.exitCode !== 0 ||
    commandResult.stdError
  ) {
    logger.warn('Failed to delete resource from template', { commandResult });
    throw new Error(
      `Failed to modify the template. ${JSON.stringify(commandResult)}`,
    );
  }

  return commandResult.stdOut;
}

export async function listBlocksCommand(
  template: string,
): Promise<CommandResult> {
  return await useTempFile(template, async (filePath) => {
    return await executeHclEditCommand(
      `-f ${escapeShellArgument(filePath)} block list`,
    );
  });
}

async function getAttributeCommand(
  filePath: string,
  resourceType: string,
  resourceName: string,
  propertyName: string,
): Promise<string> {
  const command = `-f ${escapeShellArgument(
    filePath,
  )} attribute get resource.${resourceType}.${resourceName}.${propertyName}`;

  const commandResult = await executeHclEditCommand(command);

  if (
    commandResult.exitCode !== 0 ||
    commandResult.stdError ||
    commandResult.stdOut.trim() === ''
  ) {
    return 'append';
  }

  return 'set';
}

async function updateTemplateCommand(
  filePath: string,
  modifications: string[],
): Promise<string> {
  const command = `-f ${escapeShellArgument(filePath)} ${modifications.join(
    ' | hcledit ',
  )}`;

  const commandResult = await executeHclEditCommand(command);

  if (commandResult.exitCode !== 0 || commandResult.stdError) {
    logger.warn('Failed to modify the template.', { commandResult });
    throw new Error(
      `Failed to modify the template. ${JSON.stringify(commandResult)}`,
    );
  }

  return commandResult.stdOut;
}

async function executeHclEditCommand(
  parameters: string,
): Promise<CommandResult> {
  return await executeCommand('/bin/bash', ['-c', `hcledit ${parameters}`]);
}
