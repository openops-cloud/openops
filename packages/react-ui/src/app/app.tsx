import { Toaster, TooltipProvider } from '@openops/components/ui';
import {
  DefaultErrorFunction,
  SetErrorFunction,
} from '@sinclair/typebox/errors';
import { QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '@/app/common/providers/theme-provider';

import { HelmetProvider } from 'react-helmet-async';
import { OpsErrorBoundary } from './common/error-boundaries/ops-error-boundary';
import { InitialDataGuard } from './common/guards/intial-data-guard';
import { Extensions } from './features/extensions';
import './interceptors';
import { useLogoutEventListener } from './lib/navigation-events';
import { queryClient } from './lib/query-client';
import { ApplicationRouter } from './router';

let typesFormatsAdded = false;

if (!typesFormatsAdded) {
  SetErrorFunction((error) => {
    return error?.schema?.errorMessage ?? DefaultErrorFunction(error);
  });
  typesFormatsAdded = true;
}

export function App() {
  useLogoutEventListener();
  return (
    <HelmetProvider>
      <OpsErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <InitialDataGuard>
            <TooltipProvider>
              <ThemeProvider storageKey="vite-ui-theme">
                <ApplicationRouter />
                <Toaster />
              </ThemeProvider>
            </TooltipProvider>
            <Extensions />
          </InitialDataGuard>
        </QueryClientProvider>
      </OpsErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
