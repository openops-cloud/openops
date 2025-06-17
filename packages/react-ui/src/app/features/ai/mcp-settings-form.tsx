import { SearchableSelect } from '@/app/common/components/searchable-select';
import {
  Button,
  Checkbox,
  Form,
  FormField,
  FormItem,
  Label,
} from '@openops/components/ui';
import { McpConfig } from '@openops/shared';
import equal from 'fast-deep-equal';
import { t } from 'i18next';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { appConnectionsHooks } from '../connections/lib/app-connections-hooks';
import {
  mcpFormSchemaResolver,
  McpSettingsFormSchema,
} from './lib/mcp-form-utils';

type McpSettingsFormProps = {
  savedSettings?: McpConfig;
  onSave: (settings: McpSettingsFormSchema) => void;
  isSaving: boolean;
};

export const EMPTY_MCP_FORM_VALUE: McpSettingsFormSchema = {
  awsCost: {
    enabled: false,
    connectionName: '',
  },
};

const McpSettingsForm = ({
  savedSettings,
  onSave,
  isSaving,
}: McpSettingsFormProps) => {
  const { data: awsConnections, isLoading: isAwsConnectionsLoading } =
    appConnectionsHooks.useConnections({
      authProviders: ['AWS'],
    });

  const form = useForm<McpSettingsFormSchema>({
    resolver: mcpFormSchemaResolver,
    defaultValues: EMPTY_MCP_FORM_VALUE,
    mode: 'onChange',
  });
  const [initialFormValue, setInitialFormValue] =
    useState<McpSettingsFormSchema>(EMPTY_MCP_FORM_VALUE);

  useEffect(() => {
    if (!savedSettings) {
      setInitialFormValue(EMPTY_MCP_FORM_VALUE);
      form.reset(EMPTY_MCP_FORM_VALUE);
      return;
    }

    const formValue = savedSettings ?? EMPTY_MCP_FORM_VALUE;

    setInitialFormValue(formValue);
    form.reset(formValue);
  }, [savedSettings, form]);

  const currentFormValue = form.watch();

  const connectionOptions = useMemo(() => {
    return (
      awsConnections?.data?.map((c) => ({
        label: c.name,
        value: c.name,
      })) ?? []
    );
  }, [awsConnections]);

  const isFormUnchanged = useMemo(() => {
    return equal(currentFormValue, initialFormValue);
  }, [currentFormValue, initialFormValue]);

  const resetForm = () => {
    form.reset();
  };

  const onSaveClick = () => {
    onSave(form.getValues());
  };

  return (
    <Form {...form}>
      <form className="flex-1 flex flex-col gap-4 max-w-[720px]">
        <span className="text-base bold font-bold">{t('MCP')}</span>
        <span className="text-base bold font-bold mt-2">
          {t('External tools:')}
        </span>
        <div className="flex gap-8 items-center">
          <FormField
            control={form.control}
            name="awsCost.enabled"
            render={({ field }) => (
              <FormItem className="flex gap-[6px] space-x-1 items-center">
                <Checkbox
                  id="aws-cost-enabled"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="rounded-[3px] data-[state=checked]:!bg-primary-200 data-[state=checked]:!border-primary-200"
                />
                <Label
                  htmlFor="awsCost.enabled"
                  className="text-base mt-0 whitespace-nowrap font-normal"
                  style={{ marginTop: '0rem' }}
                >
                  {t('AWS Cost')}{' '}
                </Label>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="awsCost.connectionName"
            render={({ field }) => (
              <FormItem className="flex gap-8 items-center w-full">
                <Label
                  htmlFor="awsCost.connectionName"
                  className="text-base font-normal"
                >
                  {t('Connection')}
                  {currentFormValue.awsCost?.enabled && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                <SearchableSelect
                  loading={isAwsConnectionsLoading}
                  options={connectionOptions}
                  onChange={field.onChange}
                  disabled={!currentFormValue.awsCost?.enabled}
                  value={field.value}
                  placeholder={t('Select a connection')}
                  className="w-full"
                ></SearchableSelect>
              </FormItem>
            )}
          />
        </div>

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
        </div>
      </form>
    </Form>
  );
};

McpSettingsForm.displayName = 'McpSettingsForm';
export { McpSettingsForm };
