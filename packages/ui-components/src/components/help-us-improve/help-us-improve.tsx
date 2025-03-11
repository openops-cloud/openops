import { t } from 'i18next';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { DismissiblePanel } from '../dismissible-panel/dismissible-panel';

type Props = {
  className?: string;
  onDismiss: () => void;
  onAccept: () => void;
};

const HelpUsImprove = ({ className, onDismiss, onAccept }: Props) => (
  <DismissiblePanel
    closeTooltip={t('Dismiss')}
    onClose={onDismiss}
    className={cn('p-2 bg-blueAccent/10 max-h-[160px]', className)}
  >
    <div className="p-1">
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
      <div className="flex justify-end mt-[16px] mr-4">
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
  </DismissiblePanel>
);

HelpUsImprove.displayName = 'HelpUsImprove';

export { HelpUsImprove };
