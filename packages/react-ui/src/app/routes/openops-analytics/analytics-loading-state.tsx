import { LoadingSpinner } from '@openops/components/ui';
import { t } from 'i18next';

export const AnaloyticsLoadingState = () => {
  return (
    <div className="size-full flex flex-col items-center justify-center gap-3">
      <LoadingSpinner size={50} className="stroke-blueAccent-500" />
      <span className="text-muted-foreground">{t('Loading analytics...')}</span>
    </div>
  );
};

AnaloyticsLoadingState.displayName = 'AnaloyticsLoadingState';
