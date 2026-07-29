import { FlagId } from '@openops/shared';
import { t } from 'i18next';
import { Plug, Settings, Sparkles, SunMoon } from 'lucide-react';
import { useMemo } from 'react';

import SidebarLayout from '@/app/common/components/sidebar-layout';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';

const iconSize = 20;

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function ProjectSettingsLayout({
  children,
}: SettingsLayoutProps) {
  const showAppearanceSettings = flagsHooks.useFlag(
    FlagId.DARK_THEME_ENABLED,
  ).data;

  // Hidden unless the instance can actually accept external connections: with OAuth
  // off, every route the page depends on is unregistered.
  const showConnectedApps = flagsHooks.useFlag<boolean>(
    FlagId.CONNECTED_APPS_ENABLED,
  ).data;

  /*
   * Titles are resolved here rather than in module-scope constants (OPS-4318).
   *
   * A production build can place this module in a chunk that evaluates before the entry
   * chunk runs `i18n.init()`. `t()` returns undefined until then, and a title captured
   * in a top-level constant would freeze that undefined — a nav item with no text, in
   * builds only. Inside the component the call happens at render, long after init.
   */
  const sidebarNavItems = useMemo(
    () => [
      {
        title: t('General'),
        href: '/settings/general',
        icon: <Settings size={iconSize} />,
      },
      ...(showAppearanceSettings
        ? [
            {
              title: t('Appearance'),
              href: '/settings/appearance',
              icon: <SunMoon size={iconSize} />,
            },
          ]
        : []),
      {
        title: t('OpenOps AI'),
        href: '/settings/ai',
        icon: <Sparkles size={iconSize} />,
      },
      ...(showConnectedApps
        ? [
            {
              title: t('Connected apps'),
              href: '/settings/connected-apps',
              icon: <Plug size={iconSize} />,
            },
          ]
        : []),
    ],
    [showAppearanceSettings, showConnectedApps],
  );

  return <SidebarLayout items={sidebarNavItems}>{children}</SidebarLayout>;
}
