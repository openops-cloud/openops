import { typeboxResolver } from '@hookform/resolvers/typebox';
import {
  AWS_COST_MCP_CONFIG_NAME,
  GCP_MCP_CONFIG_NAME,
  McpConfig,
  SaveMcpConfigRequest,
} from '@openops/shared';
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
  gcp: Type.Optional(
    Type.Object({
      enabled: Type.Boolean(),
      connectionName: Type.String({
        minLength: 1,
        errorMessage: 'Connection name is required when GCP is enabled',
      }),
    }),
  ),
  id: Type.Optional(Type.String()),
  gcpId: Type.Optional(Type.String()),
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

export const mapMcpConfigsToFormSchema = (
  mcpConfigs: McpConfig[],
): McpSettingsFormSchema => {
  const formSchema: McpSettingsFormSchema = {};

  mcpConfigs.forEach((config) => {
    switch (config.name) {
      case AWS_COST_MCP_CONFIG_NAME:
        formSchema.awsCost = {
          enabled: config.config.enabled as boolean,
          connectionName: config.config.connectionName as string,
        };
        formSchema.id = config.id;
        break;
      case GCP_MCP_CONFIG_NAME:
        formSchema.gcp = {
          enabled: config.config.enabled as boolean,
          connectionName: config.config.connectionName as string,
        };
        formSchema.gcpId = config.id;
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
      name: AWS_COST_MCP_CONFIG_NAME,
      config: {
        enabled: formSchema.awsCost.enabled,
        connectionName: formSchema.awsCost.connectionName,
      },
      id: formSchema.id,
    });
  }

  if (formSchema.gcp) {
    configs.push({
      name: GCP_MCP_CONFIG_NAME,
      config: {
        enabled: formSchema.gcp.enabled,
        connectionName: formSchema.gcp.connectionName,
      },
      id: formSchema.gcpId,
    });
  }

  return configs;
};
