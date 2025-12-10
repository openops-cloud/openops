import { LoadingSpinner } from '@openops/components/ui';

type FullPageSpinnerProps = {
  size?: number;
};

export const FullPageSpinner = ({ size = 50 }: FullPageSpinnerProps) => (
  <div className="bg-background flex h-screen w-screen items-center justify-center">
    <LoadingSpinner size={size} />
  </div>
);
