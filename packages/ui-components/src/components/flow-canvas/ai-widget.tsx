import { t } from 'i18next';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

const AiWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-[40px] h-[40px] absolute left-[242px] bottom-[10px] flex items-center justify-center z-50 bg-background shadow-editor rounded-xl"
          size="icon"
          onClick={() => {
            setIsOpen(true);
          }}
        >
          <Sparkles className="w-6 h-6 dark:text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={10}
        className="w-fit p-0 border-none rounded-xl !shadow-editor"
      >
        <div className="h-[58px] px-4 py-[10px] rounded-t-xl flex items-center gap-3 bg-white dark:bg-black border-b">
          <Sparkles className="w-5 h-5 dark:text-primary" />
          <h2 className="font-bold text-base">{t('AI Copilot')}</h2>
        </div>
        <div className="w-[323px] pl-[26px] py-4 text-sm bg-secondary/10">
          <span>{t('Our AI copilot is coming soon!')}</span>
          <p>
            <Link
              to="https://openops.com/pricing"
              target="_blank"
              className="font-bold text-primary-200"
            >
              {t('Learn how')}
            </Link>
            {t(' you can add it to your OpenOps installation.')}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

AiWidget.displayName = 'AiWidget';
export { AiWidget };
