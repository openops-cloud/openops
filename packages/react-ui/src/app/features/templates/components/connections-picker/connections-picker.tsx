import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { Theme, useTheme } from '@/app/common/providers/theme-provider';
import { DynamicFormValidationProvider } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';
import { CreateEditConnectionDialogContent } from '@/app/features/connections/components/create-edit-connection-dialog-content';
import { appConnectionsHooks } from '@/app/features/connections/lib/app-connections-hooks';
import { authenticationSession } from '@/app/lib/authentication-session';
import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import {
  BlockIcon,
  Button,
  DataTable,
  DialogFooter,
  OverflowTooltip,
} from '@openops/components/ui';
import {
  AppConnectionWithoutSensitiveData,
  flowHelper,
  isNil,
  Trigger,
} from '@openops/shared';
import { t } from 'i18next';
import { ArrowLeft, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ConnectionPickerTableActions,
  connectionsPickerTableColumns,
  TemplateConnectionTableData,
} from './connections-picker-table-columns';

type ConnectionsPickerProps = {
  templateName: string;
  templateTrigger?: Trigger;
  integrations: BlockMetadataModelSummary[];
  isUseTemplateLoading: boolean;
  close: () => void;
  onUseTemplate: (connections: AppConnectionWithoutSensitiveData[]) => void;
};

const ConnectionsPicker = ({
  templateName,
  templateTrigger,
  integrations,
  isUseTemplateLoading,
  close,
  onUseTemplate,
}: ConnectionsPickerProps) => {
  const [selectedBlockMetadata, setSelectedBlockMetadata] =
    useState<BlockMetadataModelSummary | null>(null);
  const [selectedConnections, setSelectedConnections] = useState<{
    [key: string]: AppConnectionWithoutSensitiveData | null;
  }>({});

  const isConnectionListPreselected = useRef(false);

  const branding = flagsHooks.useWebsiteBranding();
  const { theme } = useTheme();
  const [ownerLogoUrl, setOwnerLogoUrl] = useState(
    branding.logos.logoIconPositiveUrl,
  );
  useEffect(() => {
    setOwnerLogoUrl(() => {
      return theme === Theme.LIGHT
        ? branding.logos.logoIconPositiveUrl
        : branding.logos.logoIconUrl;
    });
  }, [branding, theme]);

  const {
    data: groupedConnections,
    isLoading,
    refetch,
  } = appConnectionsHooks.useGroupedConnections({
    projectId: authenticationSession.getProjectId() ?? '',
    blockNames: integrations.map((integration) => integration.name),
    limit: 10000,
  });

  useEffect(() => {
    if (
      !isConnectionListPreselected.current &&
      integrations &&
      groupedConnections
    ) {
      isConnectionListPreselected.current = true;
      const usedConnectionNames: { [key: string]: string | undefined } =
        templateTrigger ? flowHelper.getUsedConnections(templateTrigger) : {};

      const connections: Record<
        string,
        AppConnectionWithoutSensitiveData | null
      > = {};
      integrations.forEach((integration) => {
        const options = groupedConnections[integration.name] ?? [];
        const usedConnection = usedConnectionNames[integration.name]
          ? options.find((connection) => {
              return connection.name === usedConnectionNames[integration.name];
            })
          : null;
        connections[integration.name] = usedConnection ?? options[0] ?? null;
      });

      setSelectedConnections(connections);
    }
  }, [
    integrations,
    groupedConnections,
    setSelectedConnections,
    templateTrigger,
  ]);

  const tableData: TemplateConnectionTableData[] = useMemo(() => {
    return integrations.map((integration, index) => ({
      selectedConnection: selectedConnections[integration.name] ?? null,
      integration,
      connectionOptions: groupedConnections
        ? groupedConnections[integration.name]
        : [],
      id: String(index),
    }));
  }, [groupedConnections, integrations, selectedConnections]);

  const isAllConnectionsSelected = useMemo(() => {
    return (
      Object.values(selectedConnections).filter((c) => !isNil(c)).length ===
      integrations.length
    );
  }, [integrations, selectedConnections]);

  const onConnectionChange = (
    integrationName: string,
    connection: AppConnectionWithoutSensitiveData,
  ) => {
    setSelectedConnections((prev) => ({
      ...prev,
      [integrationName]: connection,
    }));
  };

  const onConnectionCreated = async (
    connectionName: string,
    blockName: string,
  ) => {
    setSelectedBlockMetadata(null);
    const updatedGroupedConnections = await refetch();

    const newConnection = updatedGroupedConnections?.data?.[blockName]?.find(
      (connection) => connection.name === connectionName,
    );

    if (newConnection) {
      onConnectionChange(blockName, newConnection);
    }
  };

  const onUseTemplateClick = () => {
    onUseTemplate(Object.values(selectedConnections).filter((c) => !!c));
  };

  return (
    <div className="flex flex-col gap-5 px-16 pt-[38px] pb-10">
      {selectedBlockMetadata ? (
        <DynamicFormValidationProvider>
          <CreateEditConnectionDialogContent
            block={selectedBlockMetadata}
            onConnectionSaved={(connectionName) => {
              onConnectionCreated(connectionName, selectedBlockMetadata?.name);
            }}
            reconnect={false}
            connectionToEdit={null}
            setOpen={() => {
              setSelectedBlockMetadata(null);
            }}
            showBackButton={true}
          />
        </DynamicFormValidationProvider>
      ) : (
        <>
          <div className="w-full flex items-center gap-5">
            <ArrowLeft
              role="button"
              scale={1}
              onClick={close}
              className="w-6 h-6"
            ></ArrowLeft>
            <OverflowTooltip
              className="flex-1 text-[32px] font-bold text-primary-300 dark:text-primary"
              text={templateName}
            ></OverflowTooltip>
            <div className="flex items-center gap-[6px]">
              <BlockIcon
                showTooltip={false}
                logoUrl={ownerLogoUrl}
                circle={true}
                size={'sm'}
                className="p-1 bg-blue-50"
              ></BlockIcon>
              <span>{t('By OpenOps')}</span>
            </div>
          </div>
          <p className="text-base font-normal text-primary-400 whitespace-pre-line">
            {t(
              'Your new workflow requires the following connections. We recommend setting them up now.',
            )}
          </p>
          <div>
            <DataTable
              columns={connectionsPickerTableColumns}
              data={tableData}
              loading={isLoading}
              actions={[
                (row) => {
                  return (
                    <ConnectionPickerTableActions
                      {...row}
                      addConnection={setSelectedBlockMetadata}
                      onConnectionChange={(connection) =>
                        onConnectionChange(row.integration.name, connection)
                      }
                    />
                  );
                },
              ]}
            />
          </div>

          <DialogFooter className="w-full mt-3 flex flex-row justify-between sm:justify-between">
            {!isAllConnectionsSelected && (
              <div className="flex items-center gap-1 text-sm">
                <TriangleAlert
                  width={24}
                  height={24}
                  className="text-warning"
                />
                {t(
                  'You will not be able to run the workflow until all required connections are added',
                )}
              </div>
            )}

            <Button
              onClick={onUseTemplateClick}
              loading={isUseTemplateLoading}
              size="lg"
              className="ml-auto h-12 px-4 text-base font-medium"
            >
              {t('Create workflow')}
            </Button>
          </DialogFooter>
        </>
      )}
    </div>
  );
};

ConnectionsPicker.displayName = 'ConnectionsPicker';

export { ConnectionsPicker };
