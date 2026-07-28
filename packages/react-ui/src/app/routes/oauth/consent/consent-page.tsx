import { AppLogo } from '@/app/common/components/app-logo';
import { ConsentCard } from '@/app/features/oauth/components/consent-card';
import { useOAuthConsent } from '@/app/features/oauth/hooks/use-oauth-consent';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  LoadingSpinner,
} from '@openops/components/ui';
import { t } from 'i18next';
import { useSearchParams } from 'react-router-dom';

const REQUEST_ID_PARAM = 'request_id';

const ConsentLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen w-full overflow-y-auto bg-background">
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <AppLogo className="h-10" />
      {children}
    </div>
  </div>
);

// Alert lays its children out in a row for the icon-plus-text case. This one is a
// heading above a paragraph, so it stacks them.
const ConsentError = ({ description }: { description: string }) => (
  <Alert
    variant="destructive"
    className="w-full max-w-[480px] flex-col items-start gap-2"
  >
    <AlertTitle>{t('This request cannot be completed')}</AlertTitle>
    <AlertDescription>{description}</AlertDescription>
  </Alert>
);

const ConsentPage = () => {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get(REQUEST_ID_PARAM);

  const {
    request,
    isLoading,
    loadError,
    approve,
    deny,
    isDeciding,
    decisionError,
  } = useOAuthConsent(requestId);

  if (requestId === null) {
    return (
      <ConsentLayout>
        <ConsentError
          description={t(
            'The link is missing its request id. Start the connection again from the application you were using.',
          )}
        />
      </ConsentLayout>
    );
  }

  if (isLoading) {
    return (
      <ConsentLayout>
        <LoadingSpinner size={32} />
      </ConsentLayout>
    );
  }

  // A pending request is single-use and short-lived, so a failure here is almost always
  // an expired, already-answered, or reloaded request rather than something retryable.
  if (loadError || !request) {
    return (
      <ConsentLayout>
        <ConsentError
          description={t(
            'This authorization request has expired or has already been used. Start the connection again from the application you were using.',
          )}
        />
      </ConsentLayout>
    );
  }

  return (
    <ConsentLayout>
      <ConsentCard
        request={request}
        onApprove={approve}
        onDeny={deny}
        isDeciding={isDeciding}
      />
      {decisionError && (
        <ConsentError
          description={t(
            'Your decision could not be recorded. Start the connection again from the application you were using.',
          )}
        />
      )}
    </ConsentLayout>
  );
};

ConsentPage.displayName = 'ConsentPage';
export { ConsentPage };
