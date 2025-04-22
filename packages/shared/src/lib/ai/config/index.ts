import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema } from '../../common/base-model';

export const AiConfig = Type.Object({
  ...BaseModelSchema,
  projectId: Type.String(),
  provider: Type.String(),
  model: Type.String(),
  apiKey: Type.String(),
  providerSettings: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  modelSettings: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  enabled: Type.Optional(Type.Boolean()),
});

export type AiConfig = Static<typeof AiConfig>;

export const SaveAiConfigRequest = Type.Object({
  provider: Type.String(),
  model: Type.String(),
  apiKey: Type.String(),
  providerSettings: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  modelSettings: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  enabled: Type.Optional(Type.Boolean()),
});

export type SaveAiConfigRequest = Static<typeof SaveAiConfigRequest>;
