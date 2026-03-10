import { useHasAnalyticsAccess } from '@/app/common/hooks/analytics-hooks';
import { useAuthorization } from '@/app/common/hooks/authorization-hooks';
import { MenuLink, RunsIcon } from '@openops/components/ui';
import { Permission } from '@openops/shared';
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
  const { hasAnalyticsAccess } = useHasAnalyticsAccess();
  const { checkAccess } = useAuthorization();

  const menuLinks: MenuLink[] = useMemo(() => {
    const links: MenuLink[] = [
      {
        to: '/',
        label: t('Overview'),
        icon: Home,
      },
    ];

    links.push(
      {
        to: '/flows',
        label: t('Workflows'),
        icon: Workflow,
        locked: !checkAccess(Permission.READ_FLOW),
      },
      {
        to: '/runs',
        label: t('Runs'),
        icon: RunsIcon,
        locked: !checkAccess(Permission.READ_RUN),
      },
      {
        to: '/connections',
        label: t('Connections'),
        icon: Share2,
        locked: !checkAccess(Permission.READ_APP_CONNECTION),
      },
      {
        to: '/tables',
        label: t('Tables'),
        icon: TableProperties,
        locked: !checkAccess(Permission.WRITE_TABLE),
      },
      ...(hasAnalyticsAccess
        ? [
            {
              to: '/analytics',
              label: t('Analytics'),
              icon: LucideBarChart2,
            },
          ]
        : []),
    );

    return links;
  }, [hasAnalyticsAccess, checkAccess]);

  return menuLinks;
};
