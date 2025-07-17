import { FlagId } from '@openops/shared';
import { createContext, useContext, useEffect, useState } from 'react';
import * as RippleHook from 'use-ripple-hook';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { Theme } from '@openops/components/ui';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: Theme.SYSTEM,
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);
// noinspection JSUnusedLocalSymbols
const extractSystemTheme = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? Theme.DARK
    : Theme.LIGHT;
};

const setFavicon = (url: string) => {
  let link: HTMLLinkElement | null =
    document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'shortcut icon';
    document.head.appendChild(link);
  }
  link.href = url;
};

export function ThemeProvider({
  children,
  defaultTheme = Theme.SYSTEM,
  storageKey = 'ap-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  const isDarkThemeEnabled = flagsHooks.useFlag(FlagId.DARK_THEME_ENABLED).data;
  const branding = flagsHooks.useWebsiteBranding();
  useEffect(() => {
    if (!branding) {
      console.warn('Website brand is not defined');
      return;
    }
    const root = window.document.documentElement;

    let resolvedTheme;

    if (isDarkThemeEnabled) {
      resolvedTheme = theme === Theme.SYSTEM ? extractSystemTheme() : theme;
    } else {
      resolvedTheme = Theme.LIGHT;
    }
    setTheme(resolvedTheme);
    root.classList.remove(Theme.LIGHT, Theme.DARK);
    document.title = branding.websiteName;
    setFavicon(branding.logos.favIconUrl);

    root.classList.add(resolvedTheme);
  }, [theme, branding, isDarkThemeEnabled]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};

export const useRipple = () => {
  const { theme } = useTheme();
  return RippleHook.default({
    color:
      theme === Theme.DARK
        ? 'rgba(233, 233, 233, 0.2)'
        : 'rgba(155, 155, 155, 0.2)',
    cancelAutomatically: true,
  });
};
