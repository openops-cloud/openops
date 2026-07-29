import { formatUtils } from '@/app/lib/utils';
import { Button } from '@openops/components/ui';
import { t } from 'i18next';
import { Plug } from 'lucide-react';
import { ConnectedApp } from '../lib/oauth-api';

type ConnectedAppsListProps = {
  apps: ConnectedApp[];
  onRevoke: (app: ConnectedApp) => void;
  revokingId: string | null;
};

const EmptyState = () => (
  <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-10 px-4 text-center">
    <Plug className="size-6 text-muted-foreground" />
    <span className="text-sm font-medium">
      {t('No applications are connected')}
    </span>
    <span className="text-sm text-muted-foreground max-w-[420px]">
      {t(
        'When you connect an AI agent or another application to OpenOps, it will appear here and you can disconnect it at any time.',
      )}
    </span>
  </div>
);

const ConnectedAppRow = ({
  app,
  onRevoke,
  isRevoking,
}: {
  app: ConnectedApp;
  onRevoke: (app: ConnectedApp) => void;
  isRevoking: boolean;
}) => (
  <div className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-sm font-medium truncate">{app.clientName}</span>
      <span className="text-xs text-muted-foreground">
        {t('Connected')} {formatUtils.formatDate(new Date(app.created))}
        {' · '}
        {app.lastUsedAt
          ? `${t('last used')} ${formatUtils.formatDate(
              new Date(app.lastUsedAt),
            )}`
          : t('never used')}
      </span>
    </div>

    <Button
      variant="outline"
      size="sm"
      className="shrink-0"
      loading={isRevoking}
      onClick={() => onRevoke(app)}
    >
      {t('Disconnect')}
    </Button>
  </div>
);

/**
 * One row per authorization, not per application. Connecting the same application
 * twice produces two rows, and each is disconnected on its own — which is what lets a
 * user keep one agent working while cutting off another.
 */
const ConnectedAppsList = ({
  apps,
  onRevoke,
  revokingId,
}: ConnectedAppsListProps) => {
  if (apps.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-2">
      {apps.map((app) => (
        <ConnectedAppRow
          key={app.id}
          app={app}
          onRevoke={onRevoke}
          isRevoking={revokingId === app.id}
        />
      ))}
    </div>
  );
};

ConnectedAppsList.displayName = 'ConnectedAppsList';
export { ConnectedAppsList };
