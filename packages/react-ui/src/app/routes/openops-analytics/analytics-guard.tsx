import { useHasAnalyticsAccess } from '@/app/common/hooks/analytics-hooks';
import { Navigate } from 'react-router-dom';

type AnalyticsGuardProps = {
  children: React.ReactNode;
};

export const AnalyticsGuard: React.FC<AnalyticsGuardProps> = ({ children }) => {
  const hasAnalyticsAccess = useHasAnalyticsAccess();

  if (!hasAnalyticsAccess) {
    return <Navigate to="/" replace />;
  }

  return children;
};
