import { t } from 'i18next';
import { Link } from 'react-router-dom';

export const BenchmarkAnalyticsPhase = ({
  message,
  provider,
}: {
  message: string;
  provider: string;
}) => (
  <div className="flex flex-col gap-3 py-2">
    <p className="text-sm dark:text-muted-foreground">{message}</p>
    <Link
      className="text-sm text-primary-200"
      to={`/analytics?dashboard=${provider.toLowerCase()}_benchmark`}
    >
      {t('Analytics \u2192')}
    </Link>
  </div>
);

BenchmarkAnalyticsPhase.displayName = 'BenchmarkAnalyticsPhase';
