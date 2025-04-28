import { DEFAULT_TOAST_DURATION } from '@openops/components/ui';
import { Static, Type } from '@sinclair/typebox';
import { t } from 'i18next';

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

export const AI_SETTINGS_SAVED_SUCCESSFULLY_TOAST = {
  title: t('Success'),
  description: t('AI settings are deleted successfully'),
  duration: DEFAULT_TOAST_DURATION,
};

export const AI_SETTINGS_DELETED_SUCCESSFULLY_TOAST = {
  title: t('Success'),
  description: t('AI settings are deleted successfully'),
  duration: DEFAULT_TOAST_DURATION,
};
