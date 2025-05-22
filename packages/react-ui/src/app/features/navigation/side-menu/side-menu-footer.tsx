import { MenuFooter, MenuLink } from '@openops/components/ui';
import { t } from 'i18next';
import { Wrench } from 'lucide-react';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import {
  OPENOPS_CONNECT_TEMPLATES_LOGOUT_URL,
  OPENOPS_CONNECT_TEMPLATES_URL,
} from '@/app/constants/cloud';
import { AiAssistantButton } from '@/app/features/ai/ai-assistant-button';
import { authenticationSession } from '@/app/lib/authentication-session';
import { useAppStore } from '@/app/store/app-store';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { popupFeatures } from '../../cloud/lib/popup';
import { useUserInfoPolling } from '../../cloud/lib/use-user-info-polling';

const settingsLink: MenuLink = {
  to: '/settings',
  label: t('Settings'),
  icon: Wrench,
};

type Props = {
  isMinimized: boolean;
};

const SideMenuFooter = ({ isMinimized }: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { cloudUser, setCloudUser } = useAppStore((s) => ({
    cloudUser: s.cloudUser,
    setCloudUser: s.setCloudUser,
  }));
  const user = authenticationSession.getCurrentUser();
  const useCloudTemplates = flagsHooks.useShouldFetchCloudTemplates();
  const branding = flagsHooks.useWebsiteBranding();
  const { createPollingInterval } = useUserInfoPolling();

  const cloudLogout = useCallback(() => {
    const popup = window.open(
      OPENOPS_CONNECT_TEMPLATES_LOGOUT_URL,
      'LogoutTemplates',
      popupFeatures,
    );

    if (!popup) {
      console.error(
        'Popup blocked! Could not load ' + OPENOPS_CONNECT_TEMPLATES_LOGOUT_URL,
      );
    }
    queryClient.invalidateQueries({
      queryKey: ['cloud-user-info'],
    });
    setCloudUser(null);
  }, [queryClient, setCloudUser]);

  const cloudLogin = useCallback(() => {
    const currentUser = authenticationSession.getCurrentUser();
    const popup = window.open(
      `${OPENOPS_CONNECT_TEMPLATES_URL}?projectId=${currentUser?.projectId}&userId=${currentUser?.id}`,
      'ConnectTemplates',
      'toolbar=no,status=no,width=600,height=600',
    );

    if (!popup) {
      console.error(
        'Popup blocked! Could not load ' + OPENOPS_CONNECT_TEMPLATES_URL,
      );
    }

    createPollingInterval();
  }, [createPollingInterval]);

  const onCloudLogin = useCallback(() => {
    if (cloudUser) {
      cloudLogout();
    } else {
      cloudLogin();
    }
  }, [cloudLogin, cloudLogout, cloudUser]);

  const onLogout = useCallback(() => {
    authenticationSession.logOut({
      userInitiated: true,
      navigate,
    });
  }, [navigate]);

  return (
    <MenuFooter
      settingsLink={settingsLink}
      user={user}
      onLogout={onLogout}
      isMinimized={isMinimized}
      cloudConfig={{
        user: cloudUser
          ? {
              email: cloudUser.email,
            }
          : undefined,
        isCloudLoginEnabled: useCloudTemplates,
        onCloudLogin,
        logoUrl: branding.logos.logoIconPositiveUrl,
      }}
    >
      <AiAssistantButton />
    </MenuFooter>
  );
};

SideMenuFooter.displayName = 'SideMenuFooter';
export { SideMenuFooter };
