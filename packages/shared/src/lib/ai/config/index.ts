import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema } from '../../common/base-model';
import { AiProviderEnum } from '../providers/index';

export const AiConfig = Type.Object({
  ...BaseModelSchema,
  projectId: Type.String(),
  connection: Type.String(),
  enabled: Type.Optional(Type.Boolean()),
});

export type AiConfig = Static<typeof AiConfig>;

export const AiConfigParsed = Type.Object({
  projectId: Type.String(),
  provider: Type.Enum(AiProviderEnum),
  model: Type.String(),
  apiKey: Type.String(),
  providerSettings: Type.Optional(
    Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
  ),
  modelSettings: Type.Optional(
    Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
  ),
  enabled: Type.Optional(Type.Boolean()),
});

export type AiConfigParsed = Static<typeof AiConfigParsed>;

export const SaveAiConfigRequest = Type.Object({
  id: Type.Optional(Type.String()),
  connection: Type.String(),
  enabled: Type.Optional(Type.Boolean()),
});

export type SaveAiConfigRequest = Static<typeof SaveAiConfigRequest>;

const mcpServerConfig = Type.Record(Type.String(), Type.Unknown());

export const McpConfig = Type.Object({
  ...BaseModelSchema,
  projectId: Type.String(),
  name: Type.String(),
  config: mcpServerConfig,
});

export type McpConfig = Static<typeof McpConfig>;
export const AWS_COST_MCP_CONFIG_NAME = 'aws-cost';

export const SaveMcpConfigRequest = Type.Object({
  id: Type.Optional(Type.String()),
  name: Type.String(),
  config: mcpServerConfig,
});

export type SaveMcpConfigRequest = Static<typeof SaveMcpConfigRequest>;
