import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

import '@openops/components/ui/tailwind.css';
import './i18n';
/* Make sure i18n module is imported before App component which uses translations*/
import App from './app/app';
import { AppBootstrap } from './app/app-bootstrap';
import { OpsErrorBoundary } from './app/common/error-boundaries/ops-error-boundary';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <StrictMode>
    <OpsErrorBoundary>
      <AppBootstrap>
        <App />
      </AppBootstrap>
    </OpsErrorBoundary>
  </StrictMode>,
);
