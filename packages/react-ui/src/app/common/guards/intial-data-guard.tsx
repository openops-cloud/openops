import { Suspense, useEffect, useState } from 'react';

import { FullPageSpinner } from '@/app/common/components/full-page-spinner';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import {
  setupRequestInterceptor,
  setupResponseInterceptor,
} from '@/app/interceptors';

type InitialDataGuardProps = {
  children: React.ReactNode;
};
export const InitialDataGuard = ({
  children,
}: Readonly<InitialDataGuardProps>) => {
  const { data: flags } = flagsHooks.useFlags();
  const [interceptorsReady, setInterceptorsReady] = useState(false);

  useEffect(() => {
    if (!flags) {
      console.error('Missing flags for response interceptor configuration');
      return;
    }
    const isFederatedAuth = Boolean(flags?.FEDERATED_LOGIN_ENABLED);
    setupRequestInterceptor({
      isFederatedAuth,
    });
    setupResponseInterceptor({
      isFederatedAuth,
    });
    setInterceptorsReady(true);
  }, [flags]);

  if (!interceptorsReady) {
    return <FullPageSpinner />;
  }

  return <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>;
};
