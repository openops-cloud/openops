import { AnalyticsLoadingSpinner } from '@openops/components/ui';

export const AnalyticsLoadingState = () => {
  return (
    <div className="size-full flex items-center justify-center">
      <AnalyticsLoadingSpinner />
    </div>
  );
};

AnalyticsLoadingState.displayName = 'AnaloyticsLoadingState';
