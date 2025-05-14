import { t } from 'i18next';
import { Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

const NoAiEnabledPopover = ({ className }: { className?: string }) => {
  return (
    <div className={cn('bg-background shadow-editor rounded-lg', className)}>
      <div className="h-[58px] px-4 py-[10px] rounded-t-xl flex items-center gap-3 bg-white dark:bg-black dark:text-white border-b">
        <div className="size-8 flex justify-center items-center bg-background bg-gradient-to-b from-ring/40 to-primary-200/40 rounded-xl">
          <Bot size={20} />
        </div>
        <h2 className="font-bold text-base">{t('AI Assistant')}</h2>
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
