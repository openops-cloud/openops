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
  Permission,
  removeConnectionBrackets,
} from '@openops/shared';
import { t } from 'i18next';
import { PencilLine, Plus, X } from 'lucide-react';
import type React from 'react';
import { memo, useCallback, useState } from 'react';
import { ControllerRenderProps, useFormContext } from 'react-hook-form';

import { useAuthorization } from '@/app/common/hooks/authorization-hooks';
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
  displayName?: string;
  labelPlacement?: 'top' | 'left';
};

const ConnectionSelect = memo((params: ConnectionSelectProps) => {
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [selectConnectionOpen, setSelectConnectionOpen] = useState(false);
  const [reconnectConnectionId, setReconnectConnectionId] = useState<
    string | null
  >(null);

  const { checkAccess } = useAuthorization();
  const canWriteConnection = checkAccess(Permission.WRITE_APP_CONNECTION);

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
    (e?: React.SyntheticEvent<HTMLElement>) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
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

  const suppressPointerOrMouseDown = useCallback(
    (e: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      e.preventDefault();
    },
    [],
  );

  const makeActivationKeysHandler = (
    action: (e: React.KeyboardEvent<HTMLElement>) => void,
  ) => {
    return (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.stopPropagation();
        e.preventDefault();
        action(e);
      }
    };
  };

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
              property={{
                ...params.block.auth!,
                displayName:
                  params.displayName ?? params.block.auth?.displayName ?? '',
              }}
              propertyName="auth"
              field={field as unknown as ControllerRenderProps}
              disabled={params.disabled}
              hideDescription={true}
              inputName={params.name}
              allowDynamicValues={params.allowDynamicValues}
              labelPlacement={params.labelPlacement}
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
                <SelectTrigger
                  className="h-14 flex items-center gap-2"
                  iconClassName="size-5"
                >
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <SelectValue
                      placeholder={
                        <span className="text-start block">
                          {t('Select a connection')}
                        </span>
                      }
                    >
                      {!!field.value && (
                        <span className="text-start block truncate text-primary-700 text-sm font-medium">
                          {removeConnectionBrackets(field.value)}
                        </span>
                      )}
                    </SelectValue>
                  </div>

                  {field.value && !field.disabled && !params.disabled && (
                    <div className="shrink-0 flex items-center gap-1">
                      {selectConnectionOpen && canWriteConnection && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-primary-700 text-sm font-medium"
                          onPointerDown={suppressPointerOrMouseDown}
                          onMouseDown={suppressPointerOrMouseDown}
                          onKeyDown={makeActivationKeysHandler((e) =>
                            handleReconnectClick(e),
                          )}
                          onClick={(e) => {
                            handleReconnectClick(e);
                          }}
                        >
                          <PencilLine size={16} />
                          {t('Edit')}
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-primary-700 text-sm font-medium"
                        onPointerDown={suppressPointerOrMouseDown}
                        onMouseDown={suppressPointerOrMouseDown}
                        onKeyDown={makeActivationKeysHandler(() => {
                          field.onChange('');
                        })}
                        onClick={() => {
                          field.onChange('');
                        }}
                      >
                        <X size={16} />
                        {t('Clear')}
                      </Button>
                    </div>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <ConnectionSelectContent
                    canWriteConnection={canWriteConnection}
                    connections={connectionsPage?.data ?? []}
                    onCreateNew={() => {
                      setReconnectConnectionId(null);
                      setSelectConnectionOpen(false);
                      setConnectionDialogOpen(true);
                    }}
                  />
                </SelectContent>
              </Select>
            </AutoFormFieldWrapper>
          )}
        </>
      )}
    ></FormField>
  );
});

type ConnectionSelectContentProps = {
  canWriteConnection: boolean;
  connections: { name: string }[];
  onCreateNew: () => void;
};

const ConnectionSelectContent = ({
  canWriteConnection,
  connections,
  onCreateNew,
}: ConnectionSelectContentProps) => {
  if (connections.length === 0 && !canWriteConnection) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        {t('No available connections')}
      </div>
    );
  }

  return (
    <>
      {canWriteConnection && (
        <SelectAction onClick={onCreateNew}>
          <span className="flex items-center gap-1 text-primary w-full">
            <Plus size={16} />
            {t('Create new connection')}
          </span>
        </SelectAction>
      )}

      {connections.map((connection) => (
        <SelectItem
          value={addConnectionBrackets(connection.name)}
          key={connection.name}
        >
          {connection.name}
        </SelectItem>
      ))}
    </>
  );
};

ConnectionSelect.displayName = 'ConnectionSelect';
export { ConnectionSelect };
