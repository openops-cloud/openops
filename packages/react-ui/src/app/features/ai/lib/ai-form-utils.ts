import { typeboxResolver } from '@hookform/resolvers/typebox';
import { DEFAULT_TOAST_DURATION } from '@openops/components/ui';
import { Static, Type } from '@sinclair/typebox';
import { t } from 'i18next';
import { Resolver } from 'react-hook-form';

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
  providerSettings: Type.String(),
  modelSettings: Type.String(),
});

export type AiSettingsFormSchema = Static<typeof AI_SETTINGS_FORM_SCHEMA>;

export const AI_SETTINGS_SAVED_SUCCESSFULLY_TOAST = {
  title: t('Success'),
  description: t('AI settings are saved successfully'),
  duration: DEFAULT_TOAST_DURATION,
};

export const AI_SETTINGS_DELETED_SUCCESSFULLY_TOAST = {
  title: t('Success'),
  description: t('AI settings are deleted successfully'),
  duration: DEFAULT_TOAST_DURATION,
};

export const isValidJsonField = (input: string): boolean => {
  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
};

export const aiFormSchemaResolver: Resolver<AiSettingsFormSchema> = async (
  data,
  context,
  options,
) => {
  const errors: Record<string, any> = {};

  const validateJsonField = (field: keyof AiSettingsFormSchema) => {
    try {
      JSON.parse((data[field] as string) ?? '{}');
    } catch {
      errors[field] = { message: 'InvalidJSON' };
    }
  };

  validateJsonField('providerSettings');
  validateJsonField('modelSettings');

  const typeboxValidation = await typeboxResolver(AI_SETTINGS_FORM_SCHEMA)(
    data,
    context,
    options,
  );
  return {
    ...typeboxValidation,
    errors: { ...typeboxValidation.errors, ...errors },
  };
};

export const parseJsonOrNull = (value: string | null | undefined) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};
