import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { MenuLink, Table2WithGearIcon } from '@openops/components/ui';
import { FlagId } from '@openops/shared';
import { t } from 'i18next';
import { BookOpenText } from 'lucide-react';

export const useAnalyticsLinks = () => {
  const { data: analyticsPublicUrl } = flagsHooks.useFlag<string | undefined>(
    FlagId.ANALYTICS_PUBLIC_URL,
  );

  return [
    {
      to: `${analyticsPublicUrl}/openops-analytics/`,
      target: '_blank',
      label: t('Admin Panel'),
      icon: Table2WithGearIcon,
    },
    {
      to: 'https://docs.openops.com/reporting-analytics/data-visualization',
      target: '_blank',
      label: t('Documentation'),
      icon: BookOpenText,
    },
  ] as MenuLink[];
};
