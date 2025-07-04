import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { FronteggApp } from '@frontegg/js';
import Cookies from 'js-cookie';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeFrontegg } from './frontegg-setup';

const handleAppReady = (app: FronteggApp) => {
  app.ready(() => handleLogout(app));
};

const handleLogout = (app: FronteggApp) => {
  app.logout(handleWindowClose);
};

const handleWindowClose = () => {
  if (!window.opener) {
    return;
  }
  setTimeout(() => {
    window.close();
  }, 300);
};

const CloudLogoutPage = () => {
  const navigate = useNavigate();
  const { data: flags, isLoading } = flagsHooks.useFlags();

  useEffect(() => {
    if (!flags || isLoading) {
      return;
    }
    const { FRONTEGG_URL, FRONTEGG_CLIENT_ID, FRONTEGG_APP_ID } = flags;

    if (!FRONTEGG_URL || !FRONTEGG_CLIENT_ID || !FRONTEGG_APP_ID) {
      navigate('/');
      return;
    }

    const app = initializeFrontegg(
      FRONTEGG_URL as string,
      FRONTEGG_CLIENT_ID as string,
      FRONTEGG_APP_ID as string,
    );

    Cookies.remove('cloud-token');
    Cookies.remove('cloud-refresh-token');

    handleAppReady(app);
  }, [flags, isLoading, navigate]);

  return null;
};

CloudLogoutPage.displayName = 'CloudLogoutPage';
export default CloudLogoutPage;
