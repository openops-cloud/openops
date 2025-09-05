import { Property } from '@openops/blocks-framework';
import {
  getVariables,
  parseFileContent,
  TerraformVariable,
} from '../tfvars-parser';

export function getVariableUpdatesProperty() {
  return Property.DynamicProperties({
    displayName: 'Variables to update',
    required: true,
    refreshers: ['fileContent'],
    props: async ({ fileContent }): Promise<{ [key: string]: any }> => {
      if (!fileContent) {
        return {};
      }

      const fileParsed = await parseFileContent(
        fileContent as unknown as string,
      );

      if (!fileParsed.success) {
        return {
          updates: getErrorMessageProperty(fileParsed.message),
        };
      }

      const terraformVariables: Record<string, TerraformVariable> =
        await getVariables(fileParsed.content);

      return {
        updates: getUpdatesProperty(terraformVariables),
      };
    },
  });
}

function getErrorMessageProperty(message?: string) {
  return Property.StaticDropdown({
    displayName: 'Intended modifications',
    required: true,
    options: {
      disabled: true,
      options: [],
      error: message || 'Please provide a file to see the update options.',
      placeholder: 'No options available.',
    },
  });
}

function getUpdatesProperty(
  terraformVariables: Record<string, TerraformVariable>,
) {
  return Property.Array({
    displayName: 'Intended modifications',
    required: true,
    properties: {
      variableName: Property.StaticDropdown({
        displayName: 'Variable name',
        required: true,
        options: {
          options: getVariableNameOptions(terraformVariables),
        },
      }),
      variableValue: Property.DynamicProperties({
        displayName: 'Variable value',
        required: true,
        refreshers: ['variableName'],
        props: async ({ variableName }): Promise<{ [key: string]: any }> => {
          if (!variableName) {
            return { variableValue: {} };
          }
          const variableNameProp = variableName as unknown as string;

          return {
            variableValue: getVariableValueOptions(
              terraformVariables[variableNameProp],
            ) as any,
          };
        },
      }),
    },
  });
}

function getVariableNameOptions(variables: Record<string, TerraformVariable>): {
  label: string;
  value: string;
}[] {
  return Object.keys(variables).map((variableName: string) => {
    return {
      label: variableName,
      value: variableName,
    };
  });
}

function getVariableValueOptions(variable: TerraformVariable) {
  const displayName = 'Variable value';

  switch (variable.type) {
    case 'string': {
      return Property.LongText({
        displayName,
        required: true,
        defaultValue: variable.value as string | undefined,
      });
    }
    case 'boolean': {
      const selected = variable.value as boolean;
      return Property.StaticDropdown({
        displayName: displayName,
        options: {
          options: [
            { label: 'True', value: 'true' },
            { label: 'False', value: 'false' },
          ],
        },
        required: true,
        defaultValue: `${selected}`,
      });
    }
    case 'number': {
      return Property.Number({
        displayName,
        required: true,
        defaultValue: variable.value as number | undefined,
      });
    }
    case 'object':
    case 'array': {
      return Property.Json({
        displayName,
        required: true,
        defaultValue: variable.value ?? {},
      });
    }
    default: {
      throw new Error('Invalid attribute name: ' + variable.name);
    }
  }
}
