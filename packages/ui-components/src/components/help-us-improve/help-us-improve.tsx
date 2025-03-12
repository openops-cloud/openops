import { t } from 'i18next';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';

type Props = {
  className?: string;
  onDismiss: () => void;
  onAccept: () => void;
};

const HelpUsImprove = ({ className, onDismiss, onAccept }: Props) => (
  <div
    className={cn(
      'p-3 bg-blueAccent/10 max-h-fit rounded-md border border-gray-200',
      className,
    )}
  >
    <p className="font-bold text-sm">
      <span role="img" className="mx-2" aria-label="LightBulb">
        💡
      </span>
      {t('Help Us Improve!')}
    </p>
    <p className="text-sm mx-2 mt-1">
      {t(
        'By sharing anonymous usage data, you enable us to refine and enhance your experience.',
      )}
    </p>
    <div className="flex items-center justify-between mt-[16px] mr-3">
      <Button
        variant={'ghost'}
        size="sm"
        className="text-gray-500"
        onClick={onDismiss}
      >
        {t('Close')}
      </Button>
      <Button
        variant="default"
        size="sm"
        className="font-bold h-7"
        onClick={onAccept}
      >
        {t('Accept')}
      </Button>
    </div>
  </div>
);

HelpUsImprove.displayName = 'HelpUsImprove';

export { HelpUsImprove };
