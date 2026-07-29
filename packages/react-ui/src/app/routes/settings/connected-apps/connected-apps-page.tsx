import { ConnectedAppsList } from '@/app/features/oauth/components/connected-apps-list';
import { ConsentDialog } from '@/app/features/oauth/components/consent-dialog';
import { useConnectedApps } from '@/app/features/oauth/hooks/use-connected-apps';
import { useOAuthConsent } from '@/app/features/oauth/hooks/use-oauth-consent';
import { ConnectedApp } from '@/app/features/oauth/lib/oauth-api';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  ConfirmationDialog,
  LoadingSpinner,
  Separator,
} from '@openops/components/ui';
import { t } from 'i18next';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const REQUEST_ID_PARAM = 'request_id';

const PageError = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <Alert variant="destructive" className="flex-col items-start gap-2">
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription>{description}</AlertDescription>
  </Alert>
);

const ConnectedAppsPage = () => {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get(REQUEST_ID_PARAM);

  const consent = useOAuthConsent(requestId);
  const { apps, isLoading, loadError, revoke, revokingId, revokeError } =
    useConnectedApps();

  const [appToRevoke, setAppToRevoke] = useState<ConnectedApp | null>(null);

  const confirmRevoke = useCallback(() => {
    if (appToRevoke) {
      revoke(appToRevoke.id);
      setAppToRevoke(null);
    }
  }, [appToRevoke, revoke]);

  const cancelRevoke = useCallback(() => setAppToRevoke(null), []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="space-y-6 w-full">
        <div>
          <h3 className="text-lg font-medium">{t('Connected apps')}</h3>
          <p className="text-sm text-muted-foreground">
            {t(
              'AI agents and other applications you have allowed to act in OpenOps on your behalf. Disconnecting one takes effect immediately and does not affect the others.',
            )}
          </p>
        </div>
        <Separator />

        {/* A pending request that cannot be read is almost always expired, already
            answered, or a reloaded page — the single-use record is gone either way. */}
        {requestId && consent.loadError && (
          <PageError
            title={t('This authorization request cannot be completed')}
            description={t(
              'It has expired or has already been used. Start the connection again from the application you were using.',
            )}
          />
        )}

        {consent.decisionError && (
          <PageError
            title={t('Your decision could not be recorded')}
            description={t(
              'Start the connection again from the application you were using.',
            )}
          />
        )}

        {loadError && (
          <PageError
            title={t('Connected apps could not be loaded')}
            description={t('Reload the page to try again.')}
          />
        )}

        {revokeError && (
          <PageError
            title={t('The application could not be disconnected')}
            description={t('Reload the page and try again.')}
          />
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner size={24} />
          </div>
        ) : (
          <ConnectedAppsList
            apps={apps ?? []}
            onRevoke={setAppToRevoke}
            revokingId={revokingId}
          />
        )}
      </div>

      {consent.request && (
        <ConsentDialog
          request={consent.request}
          onApprove={consent.approve}
          onDeny={consent.deny}
          isDeciding={consent.isDeciding}
        />
      )}

      <ConfirmationDialog
        isOpen={appToRevoke !== null}
        onOpenChange={(open) => !open && cancelRevoke()}
        title={t('Disconnect this application?')}
        description={t(
          'It will immediately lose access to OpenOps and will have to be authorized again to reconnect.',
        )}
        confirmButtonText={t('Disconnect')}
        onConfirm={confirmRevoke}
        onCancel={cancelRevoke}
      />
    </div>
  );
};

ConnectedAppsPage.displayName = 'ConnectedAppsPage';
export { ConnectedAppsPage };
