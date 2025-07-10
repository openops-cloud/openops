import { SearchableSelect } from '@/app/common/components/searchable-select';
import {
  Button,
  Checkbox,
  Form,
  FormField,
  FormItem,
  Label,
} from '@openops/components/ui';
import { isEmpty } from '@openops/shared';
import { t } from 'i18next';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DynamicFormValidationProvider } from '../builder/dynamic-form-validation/dynamic-form-validation-context';
import { CreateOrEditConnectionDialog } from '../connections/components/create-edit-connection-dialog';
import {
  appConnectionsHooks,
  FETCH_ALL_CONNECTIONS_LIMIT,
} from '../connections/lib/app-connections-hooks';
import {
  mcpFormSchemaResolver,
  McpSettingsFormSchema,
} from './lib/mcp-form-utils';

type McpSettingsFormProps = {
  savedSettings?: McpSettingsFormSchema;
  onSave: (settings: McpSettingsFormSchema) => void;
  isSaving: boolean;
};

export const EMPTY_MCP_FORM_VALUE: McpSettingsFormSchema = {
  awsCost: {
    enabled: false,
    connectionName: '',
  },
};

const AWS_AUTH_PROVIDER_KEY = 'AWS';

const McpSettingsForm = ({
  savedSettings,
  onSave,
  isSaving,
}: McpSettingsFormProps) => {
  const {
    data: awsConnections,
    isLoading: isAwsConnectionsLoading,
    refetch: refetchAwsConnections,
  } = appConnectionsHooks.useConnections({
    authProviders: [AWS_AUTH_PROVIDER_KEY],
    limit: FETCH_ALL_CONNECTIONS_LIMIT,
  });

  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);

  const form = useForm<McpSettingsFormSchema>({
    resolver: mcpFormSchemaResolver,
    defaultValues: EMPTY_MCP_FORM_VALUE,
    mode: 'onChange',
  });

  useEffect(() => {
    if (isEmpty(savedSettings)) {
      form.reset(EMPTY_MCP_FORM_VALUE);
      return;
    }

    const formValue = savedSettings ?? EMPTY_MCP_FORM_VALUE;

    form.reset(formValue);
  }, [savedSettings, form]);

  const awsCost = form.watch('awsCost');

  const connectionOptions = useMemo(() => {
    return (
      awsConnections?.data?.map((c) => ({
        label: c.name,
        value: c.name,
      })) ?? []
    );
  }, [awsConnections]);

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
                  className="flex items-center justify-center rounded-[3px] mt-1 data-[state=checked]:!bg-primary-200 data-[state=checked]:!border-primary-200 w-3 h-3 [&_svg]:w-3 [&_svg]:h-3"
                />
                <Label
                  htmlFor="aws-cost-enabled"
                  className="text-sm !mt-1 whitespace-nowrap font-normal"
                >
                  {t('AWS Cost')}
                </Label>
              </FormItem>
            )}
          />
          {connectionDialogOpen && (
            <DynamicFormValidationProvider>
              <CreateOrEditConnectionDialog
                connectionToEdit={null}
                reconnect={true}
                authProviderKey={AWS_AUTH_PROVIDER_KEY}
                onConnectionSaved={async (connectionName) => {
                  await refetchAwsConnections();
                  form.setValue('awsCost.connectionName', connectionName, {
                    shouldValidate: true,
                  });
                }}
                open={connectionDialogOpen}
                setOpen={setConnectionDialogOpen}
              ></CreateOrEditConnectionDialog>
            </DynamicFormValidationProvider>
          )}
          <FormField
            control={form.control}
            name="awsCost.connectionName"
            render={({ field }) => (
              <FormItem className="flex gap-8 items-center w-full">
                <Label
                  htmlFor="awsCost.connectionName"
                  className="text-sm font-normal mt-1"
                >
                  {t('Connection')}
                  {awsCost?.enabled && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                <SearchableSelect
                  loading={isAwsConnectionsLoading}
                  options={connectionOptions}
                  onChange={field.onChange}
                  disabled={!awsCost?.enabled}
                  value={field.value}
                  placeholder={t('Select a connection')}
                  className="w-full"
                  customDropdownAction={
                    <span className="flex items-center gap-1 w-full">
                      <Plus size={16} />
                      {t('Create Connection')}
                    </span>
                  }
                  onCustomDropdownActionSelect={() => {
                    setConnectionDialogOpen(true);
                  }}
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
              disabled={isSaving || !form.formState.isDirty}
            >
              {t('Cancel')}
            </Button>
            <Button
              className="w-[95px]"
              type="button"
              disabled={!form.formState.isValid || !form.formState.isDirty}
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
