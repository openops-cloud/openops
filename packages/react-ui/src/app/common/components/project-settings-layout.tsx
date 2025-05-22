import { FlagId } from '@openops/shared';
import { t } from 'i18next';
import { Puzzle, Settings, Sparkles, SunMoon } from 'lucide-react';

import SidebarLayout from '@/app/common/components/sidebar-layout';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';

const iconSize = 20;

const baseNavItems = [
  {
    title: t('General'),
    href: '/settings/general',
    icon: <Settings size={iconSize} />,
  },
  {
    title: t('Blocks'),
    href: '/settings/blocks',
    icon: <Puzzle size={iconSize} />,
  },
];

const appearanceNavItem = {
  title: t('Appearance'),
  href: '/settings/appearance',
  icon: <SunMoon size={iconSize} />,
};

const aiNavItem = {
  title: t('AI'),
  href: '/settings/ai',
  icon: <Sparkles size={iconSize} />,
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

  const sidebarNavItems = [
    ...baseNavItems,
    ...(showAppearanceSettings ? [appearanceNavItem] : []),
    ...[aiNavItem],
  ];

  return <SidebarLayout items={sidebarNavItems}>{children}</SidebarLayout>;
}
