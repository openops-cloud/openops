import { parse } from '@cdktf/hcl2json';
import { useTempFile } from '@openops/common';
import { logger } from '@openops/server-shared';
import { listBlocksCommand } from './hcledit-cli';

const messageInvalidFile =
  'The provided file is not a valid Terraform variables file (tfvars).';

type TerraformVariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object';

export type TerraformVariable = {
  name: string;
  value: unknown;
  type: TerraformVariableType;
};

export async function parseFileContent(fileContent: string): Promise<{
  success: boolean;
  message?: string;
  content: Record<string, any>;
}> {
  const json = tryParseFileAsJson(fileContent);
  if (json) {
    return {
      success: true,
      content: json,
    };
  }

  const validFile = await checkIfFileIsTerraformVariablesFile(fileContent);
  if (!validFile) {
    return {
      message: messageInvalidFile,
      success: false,
      content: {},
    };
  }

  try {
    return {
      success: true,
      content: await useTempFile(fileContent, async (filePath) => {
        return await parse(filePath, fileContent);
      }),
    };
  } catch (error) {
    logger.info('Failed to parse terraform variable file.', { error });
    return {
      message: messageInvalidFile,
      success: false,
      content: {},
    };
  }
}

export async function getVariables(
  fileContent: Record<string, unknown>,
): Promise<Record<string, TerraformVariable>> {
  const vars: Record<string, TerraformVariable> = {};

  for (const [name, value] of Object.entries(fileContent ?? {})) {
    vars[name] = { name, value, type: inferVarType(value) };
  }

  return vars;
}

function inferVarType(value: unknown): TerraformVariableType {
  if (Array.isArray(value)) {
    return 'array';
  }

  if (value === null) {
    return 'string';
  }

  switch (typeof value) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'object';
    default:
      return 'string';
  }
}

function tryParseFileAsJson(fileContent: string): Record<string, any> | null {
  const isRecord = (x: unknown): x is Record<string, unknown> =>
    typeof x === 'object' && x !== null && !Array.isArray(x);

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContent);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  return parsed as Record<string, any>;
}

async function checkIfFileIsTerraformVariablesFile(
  fileContent: string,
): Promise<boolean> {
  try {
    const commandResult = await listBlocksCommand(fileContent);
    if (commandResult.stdOut.trim().length > 0) {
      return false;
    }
  } catch (error) {
    // Ignore the error, if the command fails does not mean that the file is not valid.
  }

  return true;
}
