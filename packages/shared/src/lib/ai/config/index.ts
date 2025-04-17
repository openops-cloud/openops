import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema } from '../../common/base-model';

export const AiConfig = Type.Object({
  ...BaseModelSchema,
  id: Type.String(),
  projectId: Type.String(),
  provider: Type.String(),
  model: Type.String(),
  apiKey: Type.String(),
  modelSettings: Type.Optional(Type.Record(Type.String(), Type.Any())),
  enabled: Type.Optional(Type.Boolean()),
});

export type AiConfig = Static<typeof AiConfig>;

export const SaveAiConfigRequest = Type.Object({
  provider: Type.String(),
  model: Type.String(),
  apiKey: Type.String(),
  modelSettings: Type.Optional(Type.Record(Type.String(), Type.Any())),
  enabled: Type.Optional(Type.Boolean()),
});

export type SaveAiConfigRequest = Static<typeof SaveAiConfigRequest>;
