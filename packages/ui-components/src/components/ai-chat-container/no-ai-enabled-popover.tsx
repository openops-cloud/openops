import { t } from 'i18next';
import { Bot, X as XIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { TooltipWrapper } from '../tooltip-wrapper';

const NoAiEnabledPopover = ({
  className,
  onCloseClick,
}: {
  className?: string;
  onCloseClick: () => void;
}) => {
  return (
    <div className={cn('bg-background shadow-editor rounded-lg', className)}>
      <div className="h-[58px] pl-4 pr-2 py-[10px] rounded-t-xl flex items-center justify-between bg-white dark:bg-black dark:text-white border-b">
        <div className="flex justify-center items-center gap-3">
          <div className="size-8 flex justify-center items-center bg-background bg-gradient-to-b from-ring/40 to-primary-200/40 rounded-xl">
            <Bot size={20} />
          </div>
          <h2 className="font-bold text-base">{t('AI Assistant')}</h2>
        </div>
        <TooltipWrapper tooltipText={t('Close')}>
          <Button
            size="icon"
            variant="basic"
            onClick={onCloseClick}
            aria-label={t('Close')}
          >
            <XIcon size={20} />
          </Button>
        </TooltipWrapper>
      </div>
      <div className="w-[323px] pl-[26px] py-4 text-sm bg-secondary/10 dark:text-white">
        <span>
          {t('It looks like AI hasn’t been configured in OpenOps yet.')}
        </span>
        <p>
          {t('Please go to ')}
          <Link
            to="/settings/ai"
            target="_blank"
            className="font-bold text-primary-200"
          >
            {t('Settings')}
          </Link>
          {t(' to complete the setup.')}
        </p>
      </div>
    </div>
  );
};

NoAiEnabledPopover.displayName = 'NoAiEnabledPopover';
export { NoAiEnabledPopover };
