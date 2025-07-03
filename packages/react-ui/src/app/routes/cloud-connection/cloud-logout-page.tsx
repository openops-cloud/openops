import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import Cookies from 'js-cookie';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeFrontegg } from './frontegg-setup';

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

    app.ready(() => {
      app.logout(() => {
        if (window.opener) {
          setTimeout(() => {
            window.close();
          }, 300);
        }
      });
    });
  }, [flags, isLoading, navigate]);

  return null;
};

CloudLogoutPage.displayName = 'CloudLogoutPage';
export default CloudLogoutPage;
