import { typeboxResolver } from '@hookform/resolvers/typebox';
import { McpConfig, SaveMcpConfigRequest } from '@openops/shared';
import { Static, Type } from '@sinclair/typebox';
import { Resolver } from 'react-hook-form';

export const MCP_SETTINGS_FORM_SCHEMA = Type.Object({
  awsCost: Type.Optional(
    Type.Object({
      enabled: Type.Boolean(),
      connectionName: Type.String({
        minLength: 1,
        errorMessage: 'Connection name is required when AWS Cost is enabled',
      }),
    }),
  ),
  id: Type.Optional(Type.String()),
});

export type McpSettingsFormSchema = Static<typeof MCP_SETTINGS_FORM_SCHEMA>;

export const mcpFormSchemaResolver: Resolver<McpSettingsFormSchema> = async (
  data,
  context,
  options,
) => {
  const typeboxValidation = await typeboxResolver(MCP_SETTINGS_FORM_SCHEMA)(
    data,
    context,
    options,
  );

  return typeboxValidation;
};

const AWS_COST_MCP_NAME = 'aws-cost';

export const mapMcpConfigsToFormSchema = (
  mcpConfigs: McpConfig[],
): McpSettingsFormSchema => {
  const formSchema: McpSettingsFormSchema = {};

  mcpConfigs.forEach((config) => {
    switch (config.name) {
      case AWS_COST_MCP_NAME:
        formSchema.awsCost = {
          enabled: config.config.enabled as boolean,
          connectionName: config.config.connectionName as string,
        };
        formSchema.id = config.id;
        break;
    }
  });

  return formSchema;
};

export const mapFormSchemaToMcpConfigs = (
  formSchema: McpSettingsFormSchema,
): SaveMcpConfigRequest[] => {
  const configs: SaveMcpConfigRequest[] = [];

  if (formSchema.awsCost) {
    configs.push({
      name: AWS_COST_MCP_NAME,
      config: {
        enabled: formSchema.awsCost.enabled,
        connectionName: formSchema.awsCost.connectionName,
      },
      id: formSchema.id,
    });
  }

  return configs;
};
