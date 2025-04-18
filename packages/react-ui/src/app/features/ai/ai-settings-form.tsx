import { SearchableSelect } from '@/app/common/components/searchable-select';
import {
  AI_SETTINGS_FORM_SCHEMA,
  AiSettingsFormSchema,
} from '@/app/features/ai/lib/ai-form-utils';
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
  Textarea,
} from '@openops/components/ui';
import { t } from 'i18next';
import React, { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';

type AiSettingsFormProps = {
  aiProviders?: {
    displayName: string;
    provider: string;
    models: string[];
  }[];
  currentSettings?: AiSettingsFormSchema;
  onSave: (settings: AiSettingsFormSchema) => void;
  isSaving: boolean;
};

const EMPTY_FORM_VALUE = {
  enabled: false,
  provider: '',
  model: '',
  apiKey: '',
  baseUrl: '',
  config: '',
};

const AiSettingsForm = ({
  aiProviders,
  currentSettings,
  onSave,
  isSaving,
}: AiSettingsFormProps) => {
  const form = useForm<AiSettingsFormSchema>({
    resolver: typeboxResolver(AI_SETTINGS_FORM_SCHEMA),
    defaultValues: EMPTY_FORM_VALUE,
    mode: 'onChange',
  });

  useEffect(() => {
    if (currentSettings) {
      form.reset(currentSettings);
    }
  }, [currentSettings, form]);

  const provider = useWatch({ control: form.control, name: 'provider' });

  const providerOptions = useMemo(
    () =>
      aiProviders?.map((p) => ({
        label: p.displayName,
        value: p.provider,
      })) ?? [],
    [aiProviders],
  );

  const modelOptions = useMemo(() => {
    const selected = aiProviders?.find((p) => p.provider === provider);
    return selected?.models.map((m) => ({ label: m, value: m })) || [];
  }, [provider, aiProviders]);

  const resetForm = () => {
    form.reset(EMPTY_FORM_VALUE);
  };

  return (
    <Form {...form}>
      <form className="grid space-y-4 max-w-[516px]">
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
            <FormItem className="grid space-y-2">
              <Label htmlFor="provider">
                {t('Provider')}
                <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                loading={!providerOptions?.length}
                options={providerOptions}
                onChange={(v) => {
                  field.onChange(v);
                  form.setValue('model', '');
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
            <FormItem>
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
            <FormItem className="grid space-y-2">
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
          name="baseUrl"
          render={({ field }) => (
            <FormItem className="grid space-y-2">
              <Label htmlFor="baseUrl">{t('Base URL')}</Label>
              <Input onChange={field.onChange} value={field.value}></Input>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="config"
          render={({ field }) => (
            <FormItem className="grid space-y-2">
              <Label htmlFor="config">{t('Model configuration')}</Label>
              <Textarea
                onChange={field.onChange}
                value={field.value}
              ></Textarea>
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={resetForm}
            disabled={isSaving}
          >
            {t('Cancel')}
          </Button>
          <Button
            className="w-[95px]"
            type="button"
            disabled={!form.formState.isValid}
            onClick={() => onSave(form.getValues())}
            loading={isSaving}
          >
            {t('Save')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

AiSettingsForm.displayName = 'AiSettingsForm';
export { AiSettingsForm };
