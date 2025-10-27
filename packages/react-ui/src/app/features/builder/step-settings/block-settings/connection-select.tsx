import {
  BlockMetadataModel,
  BlockMetadataModelSummary,
} from '@openops/blocks-framework';
import {
  Button,
  FormField,
  Select,
  SelectAction,
  SelectContent,
  SelectItem,
  SelectLoader,
  SelectTrigger,
  SelectValue,
} from '@openops/components/ui';
import {
  addConnectionBrackets,
  removeConnectionBrackets,
} from '@openops/shared';
import { t } from 'i18next';
import { Plus } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { ControllerRenderProps, useFormContext } from 'react-hook-form';

import { AutoFormFieldWrapper } from '@/app/features/builder/block-properties/auto-form-field-wrapper';
import { DynamicFormValidationProvider } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';

import { CreateOrEditConnectionDialog } from '@/app/features/connections/components/create-edit-connection-dialog';
import {
  appConnectionsHooks,
  FETCH_ALL_CONNECTIONS_LIMIT,
} from '@/app/features/connections/lib/app-connections-hooks';
import { useSafeBuilderStateContext } from '../../builder-hooks';

type ConnectionSelectProps = {
  disabled: boolean;
  block: BlockMetadataModelSummary | BlockMetadataModel;
  allowDynamicValues: boolean;
  providerKey: string;
  name: string;
};

const ConnectionSelect = memo((params: ConnectionSelectProps) => {
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [selectConnectionOpen, setSelectConnectionOpen] = useState(false);
  const [reconnectConnectionId, setReconnectConnectionId] = useState<
    string | null
  >(null);

  const form = useFormContext();
  const {
    data: connectionsPage,
    isLoading,
    refetch,
  } = appConnectionsHooks.useConnections({
    authProviders: [params.providerKey],
    cursor: undefined,
    limit: FETCH_ALL_CONNECTIONS_LIMIT,
  });

  const { data: reconnectConnection, isLoading: isLoadingConnection } =
    appConnectionsHooks.useConnection({
      id: reconnectConnectionId,
    });

  const refreshDynamicProperties = useSafeBuilderStateContext(
    (state) => state?.refreshDynamicPropertiesForAuth,
  );

  const handleReconnectClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const currentValue = form.getValues(params.name);
      const connectionName = removeConnectionBrackets(currentValue ?? '');

      const matchedConnectionId =
        connectionsPage?.data?.find((c) => c.name === connectionName)?.id ??
        null;

      setReconnectConnectionId(matchedConnectionId);
      setSelectConnectionOpen(false);
      setConnectionDialogOpen(true);
    },
    [connectionsPage?.data, form, params.name],
  );

  return (
    <FormField
      control={form.control}
      name={params.name}
      render={({ field }) => (
        <>
          {isLoading && (
            <Select disabled={params.disabled}>
              <SelectContent>
                <SelectLoader />
              </SelectContent>
            </Select>
          )}
          {!isLoading && (
            <AutoFormFieldWrapper
              property={params.block.auth!}
              propertyName="auth"
              field={field as unknown as ControllerRenderProps}
              disabled={params.disabled}
              hideDescription={true}
              inputName={params.name}
              allowDynamicValues={params.allowDynamicValues}
            >
              {connectionDialogOpen && !isLoadingConnection && (
                <DynamicFormValidationProvider>
                  <CreateOrEditConnectionDialog
                    connectionToEdit={reconnectConnection ?? null}
                    reconnect={!!reconnectConnectionId}
                    key={reconnectConnection?.name || 'newConnection'}
                    authProviderKey={params.providerKey}
                    onConnectionSaved={async (connectionName) => {
                      await refetch();
                      field.onChange(addConnectionBrackets(connectionName));
                      refreshDynamicProperties?.();
                    }}
                    open={connectionDialogOpen}
                    setOpen={setConnectionDialogOpen}
                  ></CreateOrEditConnectionDialog>
                </DynamicFormValidationProvider>
              )}

              <Select
                open={selectConnectionOpen}
                onOpenChange={setSelectConnectionOpen}
                defaultValue={(field.value as string) ?? undefined}
                value={field.value ?? undefined}
                onValueChange={(v) => {
                  if (v && v !== field.value) {
                    field.onChange(v);
                  }
                }}
                disabled={params.disabled}
              >
                <div className="relative">
                  {field.value && !field.disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="z-50 absolute right-8 top-2 "
                      onClick={handleReconnectClick}
                    >
                      {t('Reconnect')}
                    </Button>
                  )}

                  <SelectTrigger className="flex gap-2 items-center">
                    <SelectValue
                      className="truncate flex-grow flex-shrink"
                      placeholder={t('Select a connection')}
                    >
                      {!!field.value && (
                        <div className="truncate flex-grow flex-shrink">
                          {removeConnectionBrackets(field.value)}
                        </div>
                      )}
                    </SelectValue>
                    <div className="grow"></div>
                    {/* Hidden Button to take same space as shown button */}
                    {field.value && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="z-50 opacity-0 pointer-events-none"
                      >
                        {t('Reconnect')}
                      </Button>
                    )}
                  </SelectTrigger>
                </div>

                <SelectContent>
                  <SelectAction
                    onClick={() => {
                      setReconnectConnectionId(null);
                      setSelectConnectionOpen(false);
                      setConnectionDialogOpen(true);
                    }}
                  >
                    <span className="flex items-center gap-1 text-primary w-full">
                      <Plus size={16} />
                      {t('Create Connection')}
                    </span>
                  </SelectAction>

                  {connectionsPage?.data &&
                    connectionsPage.data.map((connection) => {
                      return (
                        <SelectItem
                          value={addConnectionBrackets(connection.name)}
                          key={connection.name}
                        >
                          {connection.name}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </AutoFormFieldWrapper>
          )}
        </>
      )}
    ></FormField>
  );
});

ConnectionSelect.displayName = 'ConnectionSelect';
export { ConnectionSelect };
