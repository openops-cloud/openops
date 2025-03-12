import { cn } from '@openops/components/ui';
import { t } from 'i18next';
import { Eye } from 'lucide-react';
import { useIsLeftSideBarMenuCollapsed } from './hooks/useIsLeftSideBarMenuCollapsed';

const BuilderViewOnlyWidget = () => {
  const isSidebarCollapsed = useIsLeftSideBarMenuCollapsed();

  return (
    <div
      className="h-[42px] px-5 py-2 z-50 flex items-center shadow-editor gap-2.5 rounded-lg bg-greyBlue text-white"
      key={'view-only-widget'}
    >
      <span
        className={cn('text-lg font-medium text-nowrap leading-6 hidden', {
          '@[680px]:block': isSidebarCollapsed,
          '@[1050px]:block': !isSidebarCollapsed,
        })}
      >
        {t('View Only')}
      </span>
      <Eye />
    </div>
  );
};

BuilderViewOnlyWidget.displayName = 'BuilderViewOnlyWidget';
export default BuilderViewOnlyWidget;
