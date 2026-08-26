import { FlagId } from '@openops/shared';
import { t } from 'i18next';
import { Plug, Settings, Sparkles, SunMoon } from 'lucide-react';

import SidebarLayout from '@/app/common/components/sidebar-layout';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';

const iconSize = 20;

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function ProjectSettingsLayout({
  children,
}: SettingsLayoutProps) {
  const showAppearanceSettings = Boolean(
    flagsHooks.useFlag(FlagId.DARK_THEME_ENABLED).data,
  );

  const showConnectedApps = Boolean(
    flagsHooks.useFlag(FlagId.CONNECTED_APPS_ENABLED).data,
  );

  const sidebarNavItems = buildSettingsNavItems({
    showAppearanceSettings,
    showConnectedApps,
  });

  return <SidebarLayout items={sidebarNavItems}>{children}</SidebarLayout>;
}

export function buildSettingsNavItems({
  showAppearanceSettings,
  showConnectedApps,
}: {
  showAppearanceSettings: boolean;
  showConnectedApps: boolean;
}) {
  const items = [
    {
      title: t('General'),
      href: '/settings/general',
      icon: <Settings size={iconSize} />,
    },
  ];

  if (showAppearanceSettings) {
    items.push({
      title: t('Appearance'),
      href: '/settings/appearance',
      icon: <SunMoon size={iconSize} />,
    });
  }

  items.push({
    title: t('OpenOps AI'),
    href: '/settings/ai',
    icon: <Sparkles size={iconSize} />,
  });

  if (showConnectedApps) {
    items.push({
      title: t('Connected apps'),
      href: '/settings/connected-apps',
      icon: <Plug size={iconSize} />,
    });
  }

  return items;
}
