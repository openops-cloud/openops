import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

import { SUPPORT_EMAIL } from '@/app/constants/support';
import { Button } from '@openops/components/ui';
import { t } from 'i18next';
import { useRouteError } from 'react-router-dom';

export function ErrorFallback({ error }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-max p-4 w-full pb-60">
      <h2 className="text-2xl font-bold text-red-700 mb-4">
        {t('Something went wrong')}
      </h2>
      <p className="text-gray-600 mb-2">{error.message}</p>
      <p className="text-gray-600 mb-4">
        {t(
          "If it's a persistant issue, please contact support with steps to reproduce and include any relevant error messages.",
        )}
      </p>
      <div className="space-x-4">
        <Button onClick={() => window.location.reload()}>
          {t('Refresh Page')}
        </Button>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          {t('Contact Support')}
        </a>
      </div>
    </div>
  );
}

export function RouteErrorBoundary() {
  const error = useRouteError() as Error;
  return (
    <ErrorFallback
      error={error}
      resetErrorBoundary={() => window.location.reload()}
    />
  );
}

export function OpsErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
