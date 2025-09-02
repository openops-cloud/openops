import { MenuLink, RunsIcon } from '@openops/components/ui';
import { t } from 'i18next';
import { Home, LucideBarChart2, Share2, Table2, Workflow } from 'lucide-react';

export const useMenuLinks = () => {
  const menuLinks: MenuLink[] = [
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
      icon: Table2,
    },
    {
      to: '/analytics',
      label: t('Analytics'),
      icon: LucideBarChart2,
    },
  ];

  return menuLinks;
};
