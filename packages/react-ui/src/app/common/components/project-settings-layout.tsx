import { FlagId } from '@openops/shared';
import { t } from 'i18next';
import { Plug, Settings, Sparkles, SunMoon } from 'lucide-react';

import SidebarLayout from '@/app/common/components/sidebar-layout';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';

const iconSize = 20;

const baseNavItems = [
  {
    title: t('General'),
    href: '/settings/general',
    icon: <Settings size={iconSize} />,
  },
];

const appearanceNavItem = {
  title: t('Appearance'),
  href: '/settings/appearance',
  icon: <SunMoon size={iconSize} />,
};

const aiNavItem = {
  title: t('OpenOps AI'),
  href: '/settings/ai',
  icon: <Sparkles size={iconSize} />,
};

const connectedAppsNavItem = {
  title: t('Connected apps'),
  href: '/settings/connected-apps',
  icon: <Plug size={iconSize} />,
};

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function ProjectSettingsLayout({
  children,
}: SettingsLayoutProps) {
  const showAppearanceSettings = flagsHooks.useFlag(
    FlagId.DARK_THEME_ENABLED,
  ).data;
  const showConnectedApps = flagsHooks.useFlag(
    FlagId.CONNECTED_APPS_ENABLED,
  ).data;

  const sidebarNavItems = [
    ...baseNavItems,
    ...(showAppearanceSettings ? [appearanceNavItem] : []),
    aiNavItem,
    ...(showConnectedApps ? [connectedAppsNavItem] : []),
  ];

  return <SidebarLayout items={sidebarNavItems}>{children}</SidebarLayout>;
}
