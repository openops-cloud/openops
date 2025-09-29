import {
  aiFormSchemaResolver,
  AiSettingsFormSchema,
} from '@/app/features/ai/lib/ai-form-utils';
import { ConnectionSelect } from '@/app/features/builder/step-settings/block-settings/connection-select';
import {
  BlockMetadataModel,
  BlockMetadataModelSummary,
} from '@openops/blocks-framework';
import {
  Button,
  Form,
  FormField,
  FormItem,
  Label,
  Switch,
} from '@openops/components/ui';
import { AiConfig } from '@openops/shared';
import equal from 'fast-deep-equal';
import { t } from 'i18next';
import { CircleCheck } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

type AiSettingsFormProps = {
  block: BlockMetadataModelSummary | BlockMetadataModel;
  savedSettings?: AiConfig;
  onSave: (settings: AiSettingsFormSchema) => void;
  isSaving: boolean;
};

export const EMPTY_FORM_VALUE: AiSettingsFormSchema = {
  enabled: false,
  connection: '',
};

const AiSettingsForm = ({
  block,
  savedSettings,
  onSave,
  isSaving,
}: AiSettingsFormProps) => {
  const form = useForm<AiSettingsFormSchema>({
    resolver: aiFormSchemaResolver,
    defaultValues: EMPTY_FORM_VALUE,
    mode: 'onChange',
  });
  const [initialFormValue, setInitialFormValue] =
    useState<AiSettingsFormSchema>(EMPTY_FORM_VALUE);

  useEffect(() => {
    const formValue: AiSettingsFormSchema = {
      enabled: savedSettings?.enabled ?? false,
      connection: '',
    };
    setInitialFormValue(formValue);
    form.reset(formValue);
  }, [savedSettings, form]);

  const currentFormValue = form.watch();

  const isFormUnchanged = useMemo(() => {
    return equal(currentFormValue, initialFormValue);
  }, [currentFormValue, initialFormValue]);

  const isValidConnection = useMemo(() => {
    const omit = (obj?: AiSettingsFormSchema) => {
      const { enabled, ...rest } = obj ?? EMPTY_FORM_VALUE;
      return rest;
    };

    return equal(omit(currentFormValue), omit(initialFormValue));
  }, [currentFormValue, initialFormValue]);

  const resetForm = () => {
    form.reset();
  };

  const onSaveClick = () => {
    const formValue = form.getValues();
    onSave(formValue);
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
        <ConnectionSelect
          disabled={!currentFormValue.enabled}
          allowDynamicValues={false}
          block={block}
          providerKey={'Microsoft_Teams'}
          name={'connection'}
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
              onClick={onSaveClick}
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
