import { t } from 'i18next';
import { Eye } from 'lucide-react';

const BuilderViewOnlyWidget = () => {
  return (
    <div
      className="h-[42px] px-5 py-2 z-50 flex items-center shadow-editor gap-2.5 rounded-lg bg-greyBlue text-white"
      key={'view-only-widget'}
    >
      <span
        className={
          'text-sm font-medium text-nowrap leading-6 hidden @[870px]:block'
        }
      >
        {t('View Only')}
      </span>
      <Eye />
    </div>
  );
};

BuilderViewOnlyWidget.displayName = 'BuilderViewOnlyWidget';
export default BuilderViewOnlyWidget;
