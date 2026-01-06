import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { MenuLink, RunsIcon } from '@openops/components/ui';
import { FlagId } from '@openops/shared';
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
  const { data: analyticsPublicUrl } =
    flagsHooks.useFlag<string | undefined>(FlagId.ANALYTICS_PUBLIC_URL);

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
    ];

    if (analyticsPublicUrl) {
      links.push({
        to: '/analytics',
        label: t('Analytics'),
        icon: LucideBarChart2,
      });
    }

    return links;
  }, [analyticsPublicUrl]);

  return menuLinks;
};
