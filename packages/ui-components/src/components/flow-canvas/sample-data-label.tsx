import { t } from 'i18next';
import { cn } from '../../lib/cn';

const SampleDataLabel = () => {
  return (
    <div
      className={cn(
        'absolute bottom-[-20px] left-1/2 -translate-x-1/2',
        'w-[118px] h-[24px] flex items-center justify-center',
        'font-satoshi font-medium text-xs text-blueAccent-500',
        'border border-solid border-blueAccent-500 rounded-[4px]',
        'bg-background-800',
      )}
    >
      {t('Sample output')}
    </div>
  );
};

SampleDataLabel.displayName = 'SampleDataLabel';
export { SampleDataLabel };
