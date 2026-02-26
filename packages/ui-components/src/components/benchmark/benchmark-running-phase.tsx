import { t } from 'i18next';
import { LoadingSpinner } from '../../ui/spinner';

export const BenchmarkRunningPhase = () => (
  <div className="flex items-center gap-3 py-4">
    <LoadingSpinner size={16} />
    <p className="text-sm text-muted-foreground">
      {t('Running benchmark (might take a few minutes)')}
    </p>
  </div>
);

BenchmarkRunningPhase.displayName = 'BenchmarkRunningPhase';
