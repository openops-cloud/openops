import { PermissionGuard } from '@/app/common/components/permission-guard';
import { AppConnectionsTable } from '@/app/features/connections/components/connection-table';
import { useConnectionsContext } from '@/app/features/connections/components/connections-context';
import { NewConnectionTypeDialog } from '@/app/features/connections/components/new-connection-type-dialog';
import { Button, PageHeader } from '@openops/components/ui';
import { Permission } from '@openops/shared';
import { t } from 'i18next';

export const ConnectionsHeader = () => {
  const { setRefresh } = useConnectionsContext();

  return (
    <PageHeader title={t('Connections')}>
      <div className="ml-auto mr-7">
        <NewConnectionTypeDialog
          onConnectionCreated={() => setRefresh((prev) => !prev)}
        >
          <PermissionGuard permission={Permission.WRITE_APP_CONNECTION}>
            <Button variant="default">{t('New Connection')}</Button>
          </PermissionGuard>
        </NewConnectionTypeDialog>
      </div>
    </PageHeader>
  );
};

export default function AppConnectionsPage() {
  return <AppConnectionsTable />;
}
