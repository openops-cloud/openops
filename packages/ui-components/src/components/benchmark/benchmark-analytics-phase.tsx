import { t } from 'i18next';
import { Link } from 'react-router-dom';

export const BenchmarkAnalyticsPhase = ({
  message,
  onViewAnalytics,
}: {
  message: string;
  onViewAnalytics: () => void;
}) => (
  <div className="flex flex-col gap-3 py-2">
    <p className="text-sm dark:text-muted-foreground">{message}</p>
    <Link
      target="_blank"
      className="text-sm text-primary-200"
      to="/analytics"
      onClick={onViewAnalytics}
    >
      {t('Analytics \u2192')}
    </Link>
  </div>
);

BenchmarkAnalyticsPhase.displayName = 'BenchmarkAnalyticsPhase';
