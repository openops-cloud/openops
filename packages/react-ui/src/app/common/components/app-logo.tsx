import { cn, Theme } from '@openops/components/ui';
import { forwardRef, useEffect, useState } from 'react';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useTheme } from '@/app/common/providers/theme-provider';

type Props = {
  className?: string;
};

const AppLogo = forwardRef<HTMLDivElement, Props>(({ className }, ref) => {
  const branding = flagsHooks.useWebsiteBranding();
  const { theme } = useTheme();
  const [logoSrc, setLogoSrc] = useState(branding.logos.fullLogoPositiveUrl);

  useEffect(() => {
    setLogoSrc(() => {
      return theme === Theme.LIGHT
        ? branding.logos.fullLogoPositiveUrl
        : branding.logos.fullLogoUrl;
    });
  }, [branding, theme]);

  return (
    <div ref={ref} className={cn('h-[60px]', className)}>
      <img className="h-full" src={logoSrc} alt="logo" />
    </div>
  );
});

AppLogo.displayName = 'AppLogo';

export { AppLogo };
