import { t } from 'i18next';
import { Copy, Plus } from 'lucide-react';
import { useCopyToClipboard } from '../../hooks/use-copy-to-clipboard';
import { Button } from '../../ui/button';

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
  const { copyToClipboard } = useCopyToClipboard();

  const handleInject = () => {
    if (onInject) {
      onInject(content);
    }
  };

  const handleCopy = () => {
    copyToClipboard(content);
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

      <Button
        size="sm"
        variant="ghost"
        className="rounded p-2 inline-flex items-center justify-center"
        onClick={handleCopy}
      >
        <Copy className="w-4 h-4" />
      </Button>
    </div>
  );
};
