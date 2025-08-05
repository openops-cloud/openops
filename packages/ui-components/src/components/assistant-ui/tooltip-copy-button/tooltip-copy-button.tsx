import { SourceCode } from '@openops/shared';
import { t } from 'i18next';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { useCopyToClipboard } from '../../../hooks/use-copy-to-clipboard';
import { cn } from '../../../lib/cn';
import { TooltipIconButton } from '../tooltip-icon-button';

type TooltipCopyButtonProps = {
  content: string | SourceCode;
  tooltip?: string;
  className?: string;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  iconClassName?: string;
};

export const TooltipCopyButton = ({
  content,
  tooltip = t('Copy'),
  className,
  variant = 'ghost',
  size,
  iconClassName = 'w-4 h-4',
}: TooltipCopyButtonProps) => {
  const { copyToClipboard } = useCopyToClipboard();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!content || isCopied) return;
    copyToClipboard(typeof content === 'string' ? content : content?.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <TooltipIconButton
      tooltip={tooltip}
      variant={variant}
      size={size}
      className={cn(
        'text-muted-foreground ring-offset-background inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-accent enabled:hover:text-foreground focus-visible:ring-0 size-6 p-1',
        className,
      )}
      onClick={handleCopy}
    >
      {isCopied ? (
        <CheckIcon className={iconClassName} />
      ) : (
        <CopyIcon className={iconClassName} />
      )}
    </TooltipIconButton>
  );
};
