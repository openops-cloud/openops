import { t } from 'i18next';
import { X } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';

type SidebarHeaderProps = {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
};

const SidebarHeader = ({
  children,
  onClose,
  className,
}: SidebarHeaderProps) => {
  return (
    <div
      className={cn(
        'flex px-4 pt-6 pb-2 w-full justify-between items-center',
        className,
      )}
    >
      <div className="font-semibold flex-grow text-base">{children}</div>
      <Button
        variant="ghost"
        size={'xs'}
        onClick={onClose}
        aria-label={t('Close')}
      >
        <X size={16} />
      </Button>
    </div>
  );
};

export { SidebarHeader };
