import { CommandResult, executeCommand, useTempFile } from '@openops/common';
import { logger } from '@openops/server-shared';
import { escapeAttributeValue } from './modify/attribute-value-formatter';

export interface TerraformResource {
  name: string;
  type: string;
}

export async function getResources(
  template: string,
): Promise<TerraformResource[]> {
  const commandResult = await useTempFile(template, async (filePath) => {
    return await executeHclEditCommand(
      `-f ${filePath} block get resource | hcledit block list`,
    );
  });

  if (
    !commandResult ||
    commandResult.exitCode !== 0 ||
    commandResult.stdError
  ) {
    logger.error('Failed to execute the command to get resources.', {
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

  const resources = commandResult.stdOut.split('\n').map((line) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, type, name] = line.split('.').map((value) => value.trim());

    return {
      name: name,
      type: type,
    };
  });

  return resources;
}

export async function updateResourceProperties(
  template: string,
  resourceType: string,
  resourceName: string,
  modifications: { propertyName: string; propertyValue: string }[],
): Promise<string> {
  const providedTemplate = template.trim() as string;

  const result = await useTempFile(providedTemplate, async (filePath) => {
    const updates = [];
    for (const modification of modifications) {
      const propertyName = modification.propertyName;
      const propertyValue = sanitizePropertyValue(modification.propertyValue);

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
  const commandResult = await useTempFile(template, async (filePath) => {
    return await executeHclEditCommand(
      `-f ${filePath} block rm resource.${resourceType}.${resourceName}`,
    );
  });

  if (
    !commandResult ||
    commandResult.exitCode !== 0 ||
    commandResult.stdError
  ) {
    logger.error('Failed to modify the template.', { commandResult });
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
    return await executeHclEditCommand(`-f ${filePath} block list`);
  });
}

async function getAttributeCommand(
  filePath: string,
  resourceType: string,
  resourceName: string,
  propertyName: string,
): Promise<string> {
  const command = `-f ${filePath} attribute get resource.${resourceType}.${resourceName}.${propertyName}`;

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
  const command = `-f ${filePath} ${modifications.join(' | hcledit ')}`;

  const commandResult = await executeHclEditCommand(command);

  if (commandResult.exitCode !== 0 || commandResult.stdError) {
    logger.error('Failed to modify the template.', { commandResult });
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

function sanitizePropertyValue(propertyValue: string): string {
  // In the future we may need to check the type.
  // We currently only support number boolean and string

  propertyValue = propertyValue.trim();

  if (
    Number.isInteger(Number(propertyValue)) ||
    propertyValue === 'false' ||
    propertyValue === 'true'
  ) {
    return propertyValue;
  }

  return `\\"${propertyValue}\\"`;
}
