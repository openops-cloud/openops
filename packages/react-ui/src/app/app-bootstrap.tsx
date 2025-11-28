import { LoadingSpinner } from '@openops/components/ui';
import { useEffect, useState } from 'react';
import { QueryKeys } from './constants/query-keys';
import { flagsApi, FlagsMap } from './lib/flags-api';
import { initializeInternal } from './lib/initialize-internal';
import { queryClient } from './lib/query-client';

type AppBootstrapProps = {
  children: React.ReactNode;
};

type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; error: Error };

export function AppBootstrap({ children }: Readonly<AppBootstrapProps>) {
  const [state, setState] = useState<BootstrapState>({ status: 'loading' });

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const flags = await flagsApi.getAll();
        queryClient.setQueryData<FlagsMap>([QueryKeys.flags], flags);
        await initializeInternal();

        if (mounted) {
          setState({ status: 'ready' });
        }
      } catch (error) {
        console.error('Bootstrap failed:', error);
        if (mounted) {
          setState({
            status: 'error',
            error:
              error instanceof Error
                ? error
                : new Error('Failed to initialize application'),
          });
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <LoadingSpinner size={50} />
      </div>
    );
  }

  if (state.status === 'error') {
    throw state.error;
  }

  return children;
}
