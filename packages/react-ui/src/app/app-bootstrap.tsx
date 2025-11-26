import { LoadingSpinner } from '@openops/components/ui';
import { useEffect, useState } from 'react';
import { QueryKeys } from './constants/query-keys';
import { flagsApi, FlagsMap } from './lib/flags-api';
import { initializeInternal } from './lib/initialize-internal';
import { queryClient } from './lib/query-client';

type AppBootstrapProps = {
  children: React.ReactNode;
};

export function AppBootstrap({ children }: AppBootstrapProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const flags = await flagsApi.getAll();
        queryClient.setQueryData<FlagsMap>([QueryKeys.flags], flags);
        await initializeInternal();

        if (mounted) {
          setIsReady(true);
        }
      } catch (error) {
        console.error('Bootstrap failed:', error);
        if (mounted) {
          setIsReady(true);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  if (!isReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <LoadingSpinner size={50} />
      </div>
    );
  }

  return children;
}
