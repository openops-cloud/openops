import { formatUtils } from '@/app/lib/utils';
import { Button } from '@openops/components/ui';
import { t } from 'i18next';
import { Plug } from 'lucide-react';
import { ConnectedApp, OAuthResourceId } from '../lib/oauth-api';

/**
 * How the application reaches OpenOps. Worth showing because it is the one thing that
 * distinguishes otherwise identical rows, and it is not derivable from anything else the
 * row displays.
 */
const describeResource = (resourceId: OAuthResourceId | null): string => {
  if (resourceId === 'mcp') {
    return t('via the MCP server');
  }
  if (resourceId === 'api') {
    return t('via the API');
  }
  return t('unknown connection type');
};

type ConnectedAppsListProps = {
  apps: ConnectedApp[];
  onRevoke: (app: ConnectedApp) => void;
  revokingId: string | null;
};

const EmptyState = () => (
  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-background p-6 py-10 text-center">
    <Plug className="size-6 text-muted-foreground" />
    <span className="text-base font-semibold text-foreground">
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
  <div className="flex items-center justify-between gap-6 rounded-lg border bg-background p-6">
    <div className="flex items-center gap-6 min-w-0">
      {/* Stands in for the product logo an integration card shows. Connected
          applications are self-registered, so there is no artwork to use. */}
      <div className="flex size-12 shrink-0 items-center justify-center rounded-md border">
        <Plug className="size-6 text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-base font-semibold text-foreground truncate">
          {app.clientName}
        </span>
        <span className="text-sm text-muted-foreground">
          {describeResource(app.resourceId)}
          {' · '}
          {t('connected')} {formatUtils.formatDate(new Date(app.created))}
          {' · '}
          {app.lastUsedAt
            ? `${t('last used')} ${formatUtils.formatDate(
                new Date(app.lastUsedAt),
              )}`
            : t('never used')}
        </span>
      </div>
    </div>

    <Button
      variant="destructive"
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
    <div className="flex flex-col gap-4">
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
