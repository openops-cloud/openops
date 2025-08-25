import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useTheme } from '@/app/common/providers/theme-provider';
import { Theme } from '@openops/components/ui';
import { useEffect, useState } from 'react';

export const useOwnerLogoUrl = () => {
  const { theme } = useTheme();
  const branding = flagsHooks.useWebsiteBranding();

  const [ownerLogoUrl, setOwnerLogoUrl] = useState(
    branding.logos.logoIconPositiveUrl,
  );

  useEffect(() => {
    setOwnerLogoUrl(() => {
      return theme === Theme.LIGHT
        ? branding.logos.logoIconPositiveUrl
        : branding.logos.logoIconUrl;
    });
  }, [branding, theme]);

  return ownerLogoUrl;
};
