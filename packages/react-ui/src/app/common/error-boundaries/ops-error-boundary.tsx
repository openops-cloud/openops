import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

import { SUPPORT_EMAIL } from '@/app/constants/support';
import { Button } from '@openops/components/ui';
import { t } from 'i18next';

export function ErrorFallback({ error }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 w-full pb-40">
      <h2 className="text-2xl font-bold text-red-600 mb-4">
        {t('Something went wrong')}
      </h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
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
