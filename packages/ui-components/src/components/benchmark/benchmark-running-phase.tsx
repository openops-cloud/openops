import { t } from 'i18next';
import { LoadingSpinner } from '../../ui/spinner';

interface BenchmarkRunningPhaseProps {
  progress?: { completed: number; total: number };
}

export const BenchmarkRunningPhase = ({
  progress,
}: BenchmarkRunningPhaseProps) => (
  <div className="flex items-center gap-3 py-4">
    <LoadingSpinner size={16} />
    <p className="text-sm text-muted-foreground">
      {t('Running benchmark (might take a few minutes)')}
      {progress !== undefined && (
        <span className="ml-1">
          {`${t('— Running workflows')} ${progress.completed}/${
            progress.total
          }...`}
        </span>
      )}
    </p>
  </div>
);

BenchmarkRunningPhase.displayName = 'BenchmarkRunningPhase';
