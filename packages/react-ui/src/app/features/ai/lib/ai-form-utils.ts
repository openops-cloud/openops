import { Static, Type } from '@sinclair/typebox';

export const AI_SETTINGS_FORM_SCHEMA = Type.Object({
  enabled: Type.Boolean(),
  provider: Type.String({
    minLength: 1,
  }),
  model: Type.String({
    minLength: 1,
  }),
  apiKey: Type.String({
    minLength: 1,
  }),
  providerSettings: Type.Optional(
    Type.Union([Type.Record(Type.String(), Type.String()), Type.Null()]),
  ),
  modelSettings: Type.Optional(
    Type.Union([Type.Record(Type.String(), Type.String()), Type.Null()]),
  ),
});

export type AiSettingsFormSchema = Static<typeof AI_SETTINGS_FORM_SCHEMA>;
