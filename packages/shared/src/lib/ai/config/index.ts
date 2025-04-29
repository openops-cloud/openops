import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema } from '../../common/base-model';
import { AiProviderEnum } from '../providers/index';

export const AiConfig = Type.Object({
  ...BaseModelSchema,
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

export type AiConfig = Static<typeof AiConfig>;

export const SaveAiConfigRequest = Type.Object({
  id: Type.Optional(Type.String()),
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

export type SaveAiConfigRequest = Static<typeof SaveAiConfigRequest>;
