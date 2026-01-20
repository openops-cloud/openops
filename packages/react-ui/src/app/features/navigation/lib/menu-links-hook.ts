import { useHasAnalyticsAccess } from '@/app/common/hooks/analytics-hooks';
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
  const { hasAnalyticsAccess } = useHasAnalyticsAccess();

  const menuLinks: MenuLink[] = useMemo(() => {
    const links: MenuLink[] = [
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
      ...(hasAnalyticsAccess
        ? [
            {
              to: '/analytics',
              label: t('Analytics'),
              icon: LucideBarChart2,
            },
          ]
        : []),
    ];

    return links;
  }, [hasAnalyticsAccess]);

  return menuLinks;
};
