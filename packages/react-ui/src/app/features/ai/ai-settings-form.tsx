import { SearchableSelect } from '@/app/common/components/searchable-select';
import {
  AI_SETTINGS_FORM_SCHEMA,
  AiSettingsFormSchema,
} from '@/app/features/ai/lib/ai-form-utils';
import { DictionaryProperty } from '@/app/features/builder/block-properties/dictionary-property';
import { typeboxResolver } from '@hookform/resolvers/typebox';
import {
  AutocompleteInput,
  Button,
  Form,
  FormField,
  FormItem,
  Input,
  Label,
  Switch,
} from '@openops/components/ui';
import { AiConfig } from '@openops/shared';
import equal from 'fast-deep-equal';
import { t } from 'i18next';
import { CircleCheck } from 'lucide-react';
import React, { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';

type AiSettingsFormProps = {
  aiProviders?: {
    provider: string;
    models: string[];
  }[];
  isAiProvidersLoading: boolean;
  savedSettings?: AiConfig;
  onSave: (settings: AiSettingsFormSchema) => void;
  isSaving: boolean;
};

const EMPTY_FORM_VALUE: AiSettingsFormSchema = {
  enabled: false,
  provider: '',
  apiKey: '',
  modelSettings: {},
  providerSettings: {},
  model: '',
};

const AiSettingsForm = ({
  aiProviders,
  isAiProvidersLoading,
  savedSettings,
  onSave,
  isSaving,
}: AiSettingsFormProps) => {
  const form = useForm<AiSettingsFormSchema>({
    resolver: typeboxResolver(AI_SETTINGS_FORM_SCHEMA),
    defaultValues: EMPTY_FORM_VALUE,
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset((savedSettings as AiSettingsFormSchema) ?? EMPTY_FORM_VALUE);
  }, [savedSettings, form]);

  const currentFormValue = form.watch();
  const provider = useWatch({ control: form.control, name: 'provider' });

  const providerOptions = useMemo(
    () =>
      aiProviders?.map((p) => ({
        label: p.provider,
        value: p.provider,
      })) ?? [],
    [aiProviders],
  );

  const modelOptions = useMemo(() => {
    const selected = aiProviders?.find((p) => p.provider === provider);
    return selected?.models.map((m) => ({ label: m, value: m })) || [];
  }, [provider, aiProviders]);

  const isFormUnchanged = useMemo(() => {
    return equal(currentFormValue, savedSettings);
  }, [currentFormValue, savedSettings]);

  const isValidConnection = useMemo(() => {
    const omit = (obj?: AiSettingsFormSchema) => {
      const { enabled, ...rest } = obj ?? EMPTY_FORM_VALUE;
      return rest;
    };

    return equal(
      omit(currentFormValue),
      omit(savedSettings as AiSettingsFormSchema),
    );
  }, [currentFormValue, savedSettings]);

  const resetForm = () => {
    form.reset();
  };

  const resetModel = () => {
    form.setValue('model', '');
    form.trigger('model');
  };

  return (
    <Form {...form}>
      <form className="flex-1 flex flex-col gap-4 max-w-[516px]">
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex gap-[6px]">
              <Switch
                id="enabled"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="enabled">{t('Enable AI')}</Label>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <Label htmlFor="provider">
                {t('Choose your AI provider')}
                <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                loading={isAiProvidersLoading}
                options={providerOptions}
                onChange={(v) => {
                  field.onChange(v);
                  resetModel();
                }}
                value={field.value}
                placeholder={t('Select an option')}
              ></SearchableSelect>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <Label htmlFor="model">
                {t('Model')} <span className="text-destructive">*</span>
              </Label>
              <AutocompleteInput
                options={modelOptions}
                disabled={!provider}
                onChange={field.onChange}
                value={field.value}
                className="w-full"
              ></AutocompleteInput>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="apiKey"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <Label htmlFor="apiKey">
                {t('API key')} <span className="text-destructive">*</span>
              </Label>
              <Input
                onChange={field.onChange}
                value={field.value}
                type="password"
                required={true}
              ></Input>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="providerSettings"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <Label htmlFor="providerSettings">{t('Provider Settings')}</Label>
              <DictionaryProperty
                values={field.value ?? {}}
                onChange={field.onChange}
                keyPlaceholder={t('Key')}
                valuePlaceholder={t('Value')}
              ></DictionaryProperty>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="modelSettings"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <Label htmlFor="modelSettings">{t('Model Settings')}</Label>
              <DictionaryProperty
                values={field.value ?? {}}
                onChange={field.onChange}
                keyPlaceholder={t('Key')}
                valuePlaceholder={t('Value')}
              ></DictionaryProperty>
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between ">
          <div className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={resetForm}
              disabled={isSaving || isFormUnchanged}
            >
              {t('Cancel')}
            </Button>
            <Button
              className="w-[95px]"
              type="button"
              disabled={!form.formState.isValid || isFormUnchanged}
              onClick={() => onSave(form.getValues())}
              loading={isSaving}
            >
              {t('Save')}
            </Button>
          </div>
          {savedSettings?.id && isValidConnection && (
            <div className="flex items-center gap-2">
              <CircleCheck size={24} className="text-success-300" />
              <span>{t('Valid Connection')}</span>
            </div>
          )}
        </div>
      </form>
    </Form>
  );
};

AiSettingsForm.displayName = 'AiSettingsForm';
export { AiSettingsForm };
