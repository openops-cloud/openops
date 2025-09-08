import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import { updateVariablesFile } from '../hcledit-cli';
import { tryParseFileAsJson } from '../tfvars-parser';
import { getVariableUpdatesProperty } from './variable-updates-property';

export const modifyVariablesFile = createAction({
  auth: BlockAuth.None(),
  name: 'update_terraform_variables_file',
  displayName: 'Update variables file',
  description:
    'Updates variables of a given Terraform variables file (tfvars).',
  props: {
    fileContent: Property.LongText({
      displayName: 'Terraform variables file (tfvars)',
      required: true,
    }),

    updates: getVariableUpdatesProperty(),
  },
  async run({ propsValue }) {
    const { fileContent, updates } = propsValue;

    const modifications = (
      updates['updates'] as {
        variableName: string;
        variableValue: { variableValue: unknown };
      }[]
    ).map((m) => ({
      variableName: m.variableName,
      variableValue: m.variableValue.variableValue,
    }));

    const json = tryParseFileAsJson(fileContent);
    if (json) {
      return applyJsonModifications(json, modifications);
    } else {
      return await updateVariablesFile(fileContent, modifications);
    }
  },
});

function applyJsonModifications(
  json: Record<string, any>,
  modifications: { variableName: string; variableValue: unknown }[],
): string {
  for (const { variableName, variableValue } of modifications) {
    json[variableName] = sanitizeValue(variableValue);
  }

  return JSON.stringify(json, null, 2);
}

function sanitizeValue(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;

  if (typeof value === 'string' && value.trim() !== '') {
    const num = Number(value);
    if (!isNaN(num)) return num;
  }

  return value;
}
