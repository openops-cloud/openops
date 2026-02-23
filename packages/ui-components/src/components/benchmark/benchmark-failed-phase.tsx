import { Button } from '@/ui/button';
import { t } from 'i18next';

export const BenchmarkFailedPhase = ({
  onViewRun,
  onResetRun,
}: {
  onViewRun: () => void;
  onResetRun: () => void;
}) => (
  <div className="flex flex-col gap-3 py-2">
    <p className="text-sm text-destructive">
      {t(
        'The benchmark run failed. You can review the run details to investigate.',
      )}
    </p>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onViewRun}>
        {t('View run')}
      </Button>
      <Button size="sm" onClick={onResetRun}>
        {t('Run again')}
      </Button>
    </div>
  </div>
);

BenchmarkFailedPhase.displayName = 'BenchmarkFailedPhase';
