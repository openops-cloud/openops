import { authenticationSession } from '@/app/lib/authentication-session';
import { MenuLink, RunsIcon } from '@openops/components/ui';
import { t } from 'i18next';
import {
  Home,
  LucideBarChart2,
  Share2,
  TableProperties,
  Workflow,
} from 'lucide-react';
import { useMemo } from 'react';

/**
 * useMenuLinks
 *
 * This hook centralizes the app's main side‑menu configuration to make it easy
 * to dynamically add or hide menu items from a single place.
 *
 */
export const useMenuLinks = () => {
  const hasAnalyticsPrivileges =
    authenticationSession.getUserHasAnalyticsPrivileges();

  const menuLinks: MenuLink[] = useMemo(
    () => [
      {
        to: '/',
        label: t('Overview'),
        icon: Home,
      },
      {
        to: '/flows',
        label: t('Workflows'),
        icon: Workflow,
      },
      {
        to: '/runs',
        label: t('Runs'),
        icon: RunsIcon,
      },
      {
        to: '/connections',
        label: t('Connections'),
        icon: Share2,
      },
      {
        to: '/tables',
        label: t('Tables'),
        icon: TableProperties,
      },
      ...(hasAnalyticsPrivileges
        ? [
            {
              to: '/analytics',
              label: t('Analytics'),
              icon: LucideBarChart2,
            },
          ]
        : []),
    ],
    [hasAnalyticsPrivileges],
  );

  return menuLinks;
};
