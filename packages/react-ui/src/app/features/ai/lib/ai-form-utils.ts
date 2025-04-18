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
  baseUrl: Type.String(),
  config: Type.String(),
});

export type AiSettingsFormSchema = Static<typeof AI_SETTINGS_FORM_SCHEMA>;
