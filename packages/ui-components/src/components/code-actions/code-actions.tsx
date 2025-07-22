import { t } from 'i18next';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { TooltipCopyButton } from '../assistant-ui/tooltip-copy-button';

export type CodeActionsProps = {
  content: string;
  onInject?: (content: string) => void;
  injectButtonText?: string;
  showInjectButton?: boolean;
  className?: string;
};

export const CodeActions = ({
  content,
  onInject,
  injectButtonText = t('Use code'),
  showInjectButton = true,
  className = 'flex gap-2 items-center justify-end mt-1',
}: CodeActionsProps) => {
  const handleInject = () => {
    if (onInject) {
      onInject(content);
    }
  };

  return (
    <div className={className}>
      {showInjectButton && onInject && (
        <Button
          size="sm"
          variant="ghost"
          className="rounded p-2 inline-flex items-center justify-center text-xs font-sans"
          onClick={handleInject}
        >
          <Plus className="w-4 h-4" />
          {injectButtonText}
        </Button>
      )}

      <TooltipCopyButton
        content={content}
        tooltip={t('Copy')}
        size="sm"
        className="rounded p-0 inline-flex items-center justify-center flex-shrink-0 text-foreground"
      />
    </div>
  );
};
