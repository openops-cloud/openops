import { Toaster, TooltipProvider } from '@openops/components/ui';
import {
  DefaultErrorFunction,
  SetErrorFunction,
} from '@sinclair/typebox/errors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '@/app/common/providers/theme-provider';

import { OpsErrorBoundary } from './common/error-boundaries/ops-error-boundary';
import { InitialDataGuard } from './common/guards/intial-data-guard';
import './interceptors';
import { ApplicationRouter } from './router';

const queryClient = new QueryClient();
let typesFormatsAdded = false;

if (!typesFormatsAdded) {
  SetErrorFunction((error) => {
    return error?.schema?.errorMessage ?? DefaultErrorFunction(error);
  });
  typesFormatsAdded = true;
}

export function App() {
  return (
    <OpsErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <InitialDataGuard>
          <TooltipProvider>
            <ThemeProvider storageKey="vite-ui-theme">
              <ApplicationRouter />
              <Toaster />
            </ThemeProvider>
          </TooltipProvider>
        </InitialDataGuard>
      </QueryClientProvider>
    </OpsErrorBoundary>
  );
}

export default App;
