import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import { updateVariablesFile } from '../hcledit-cli';
import { getVariableUpdatesProperty } from './variable-updates-property';

export const modifyVariablesFile = createAction({
  auth: BlockAuth.None(),
  name: 'update_terraform_variables_file',
  displayName: 'Update variables file',
  description: 'Updates variables of a given Terraform variables file.',
  props: {
    fileContent: Property.LongText({
      displayName: 'Terraform variables file',
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

    return await updateVariablesFile(fileContent, modifications);
  },
});
