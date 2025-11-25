import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

import '@openops/components/ui/tailwind.css';
import './styles.css';
import './i18n';
/* Make sure i18n module is imported before App component which uses translations*/
import App from './app/app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
