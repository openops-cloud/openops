import { t } from 'i18next';

export const BenchmarkFailedPhase = () => (
  <div className="flex flex-col gap-3 py-2">
    <p className="text-sm text-destructive">
      {t(
        'The benchmark run failed. You can review the run details to investigate.',
      )}
    </p>
  </div>
);

BenchmarkFailedPhase.displayName = 'BenchmarkFailedPhase';
