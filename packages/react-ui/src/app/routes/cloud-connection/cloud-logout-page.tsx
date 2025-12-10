import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { initializeFrontegg } from '@/app/lib/frontegg-setup';
import { FronteggApp } from '@frontegg/js';
import Cookies from 'js-cookie';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
    const { FRONTEGG_URL } = flags;

    if (!FRONTEGG_URL) {
      navigate('/');
      return;
    }

    const app = initializeFrontegg({ url: FRONTEGG_URL as string });

    Cookies.remove('cloud-token');
    Cookies.remove('cloud-refresh-token');

    handleAppReady(app);
  }, [flags, isLoading, navigate]);

  return null;
};

CloudLogoutPage.displayName = 'CloudLogoutPage';
export default CloudLogoutPage;
