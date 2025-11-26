import { LoadingSpinner } from '@openops/components/ui';
import { Suspense, useEffect } from 'react';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { setupResponseInterceptor } from '@/app/interceptors';

type InitialDataGuardProps = {
  children: React.ReactNode;
};
export const InitialDataGuard = ({
  children,
}: Readonly<InitialDataGuardProps>) => {
  const { data: flags } = flagsHooks.useFlags();
  flagsHooks.prefetchFlags();

  useEffect(() => {
    if (!flags) {
      console.error('Missing flags for response interceptor configuration');
    }
    setupResponseInterceptor({
      isFederatedAuth: Boolean(flags?.FEDERATED_LOGIN_ENABLED),
    });
  }, [flags]);

  return (
    <Suspense
      fallback={
        <div className="bg-background flex h-screen w-screen items-center justify-center ">
          <LoadingSpinner size={50}></LoadingSpinner>
        </div>
      }
    >
      {children}
    </Suspense>
  );
};
