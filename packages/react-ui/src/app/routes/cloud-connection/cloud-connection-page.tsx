import { AppLogo } from '@/app/common/components/app-logo';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { ORGIN_PROJECT_ID_KEY, ORGIN_USER_ID_KEY } from '@/app/constants/cloud';
import { cloudUserApi } from '@/app/features/cloud/lib/cloud-user-api';
import { getProjectIdSearchParam } from '@/app/features/cloud/lib/utils';
import { t } from 'i18next';
import Cookies from 'js-cookie';
import { User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffectOnce } from 'react-use';
import { additionalFronteggParams, initializeFrontegg } from './frontegg-setup';
import { getExpirationDate } from './jwt-utils';

const CloudLoggedInBrief = () => (
  <div className="flex flex-col items-center h-[100vh] p-5 gap-4">
    <AppLogo className="h-12" />
    <div className="w-[42px] h-[42px] mt-[100px] bg-gray-300 rounded-full flex items-center justify-center">
      <User />
    </div>
    <h1 className="text-base text-center">
      {t('You are now logged in,')}
      <br />
      {t('you can close this window anytime.')}
    </h1>
  </div>
);

const CloudConnectionPage = () => {
  const navigate = useNavigate();
  const { data: flags, isLoading } = flagsHooks.useFlags();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffectOnce(() => {
    const { projectId, userId } = getProjectIdSearchParam();

    if (projectId) {
      // projectId query param gets lost during the OAuth flow redirects
      sessionStorage.setItem(ORGIN_PROJECT_ID_KEY, projectId);
    }
    if (userId) {
      // userId query param gets lost during the OAuth flow redirects
      sessionStorage.setItem(ORGIN_USER_ID_KEY, userId);
    }
  });

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

    app.ready(() => {
      app.store.subscribe(() => {
        const { auth } = app.store.getState();

        if (!auth.isLoading) {
          if (!auth.isAuthenticated) {
            // https://developers.frontegg.com/sdks/components/auth-functions#frontegg_after_auth_redirect_url
            localStorage.setItem(
              'FRONTEGG_AFTER_AUTH_REDIRECT_URL',
              '/oauth/callback',
            );
            app.loginWithRedirect(additionalFronteggParams);
          } else {
            if (auth.user?.accessToken && auth.user?.refreshToken) {
              Cookies.set('cloud-token', auth.user.accessToken, {
                sameSite: 'None',
                secure: true,
                expires: getExpirationDate(auth.user.accessToken),
              });
              Cookies.set('cloud-refresh-token', auth.user.refreshToken, {
                sameSite: 'None',
                secure: true,
                expires: getExpirationDate(auth.user.accessToken),
              });

              const originProjectId =
                sessionStorage.getItem(ORGIN_PROJECT_ID_KEY);
              const originUserId = sessionStorage.getItem(ORGIN_USER_ID_KEY);
              if (originProjectId && originUserId) {
                cloudUserApi.setUserOriginMetadata({
                  origin: {
                    projectId: originProjectId,
                    userId: originUserId,
                  },
                  frontegg: {
                    domain: FRONTEGG_URL as string,
                    user: {
                      tenantId: auth.user.tenantId,
                      id: auth.user.id,
                      accessToken: auth.user.accessToken,
                      metadata: auth.user.metadata,
                    },
                  },
                });
              }

              setIsAuthenticated(true);
              const frontegAppWdigetEl =
                document?.querySelector<HTMLElement>('frontegg-app');

              if (frontegAppWdigetEl) {
                frontegAppWdigetEl.style.display = 'none';
              }
            }
          }
        }
      });
    });
  }, [flags, flags.data, isLoading, navigate]);

  if (isAuthenticated) {
    return <CloudLoggedInBrief />;
  }

  return null;
};

CloudConnectionPage.displayName = 'CloudConnectionPage';
export { CloudConnectionPage };
