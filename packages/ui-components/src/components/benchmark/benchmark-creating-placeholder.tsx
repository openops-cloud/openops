import { t } from 'i18next';
import { LoadingSpinner } from '../../ui/spinner';

export const BenchmarkCreatingPlaceholder = () => (
  <div className="flex items-center justify-center gap-2 h-full py-12">
    <LoadingSpinner size={16} />
    <p className="text-sm text-primary-800 font-semibold">
      {t('Creating workflows for the Benchmark report')}
    </p>
  </div>
);

BenchmarkCreatingPlaceholder.displayName = 'BenchmarkCreatingPlaceholder';
