import { t } from 'i18next';

export const AnaloyticsLoadingState = () => {
  return (
    <div className="size-full flex items-center justify-center">
      <span className="text-muted-foreground">
        {t('Loading dashboards...')}
      </span>
    </div>
  );
};

AnaloyticsLoadingState.displayName = 'AnaloyticsLoadingState';
