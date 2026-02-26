import { LoadingSpinner } from '@openops/components/ui';

export const AnalyticsLoadingState = () => {
  return (
    <div className="size-full flex flex-col items-center justify-center gap-3">
      <LoadingSpinner size={50} className="stroke-blueAccent-500" />
    </div>
  );
};

AnalyticsLoadingState.displayName = 'AnaloyticsLoadingState';
