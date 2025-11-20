import { AppLogo } from '@/app/common/components/app-logo';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { ORGIN_PROJECT_ID_KEY, ORGIN_USER_ID_KEY } from '@/app/constants/cloud';
import { cloudUserApi } from '@/app/features/cloud/lib/cloud-user-api';
import { getProjectIdSearchParam } from '@/app/features/cloud/lib/utils';
import {
  additionalFronteggParams,
  initializeFrontegg,
} from '@/app/lib/frontegg-setup';
import { getExpirationDate } from '@/app/lib/jwt-utils';
import { CloudLoggedInBrief } from '@openops/components/ui';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffectOnce } from 'react-use';

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
    const { FRONTEGG_URL } = flags;

    if (!FRONTEGG_URL) {
      navigate('/');
      return;
    }

    const app = initializeFrontegg(FRONTEGG_URL as string);

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
    return <CloudLoggedInBrief appLogo={<AppLogo className="h-12" />} />;
  }

  return null;
};

CloudConnectionPage.displayName = 'CloudConnectionPage';
export { CloudConnectionPage };
