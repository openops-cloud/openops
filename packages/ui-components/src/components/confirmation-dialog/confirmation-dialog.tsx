import { t } from 'i18next';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button, ButtonProps } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';

type ConfirmationDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  /** Renders beside the title and description (e.g. warning icon) for modal layouts that need a leading visual. */
  headerLeading?: ReactNode;
  children?: React.ReactNode;
};

export type ConfirmationDialogContent = {
  title: string;
  description: ReactNode;
  confirmButtonText?: string;
  confirmButtonVariant?: ButtonProps['variant'];
  cancelButtonText?: string;
};

const ConfirmationDialog = ({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmButtonText,
  confirmButtonVariant,
  cancelButtonText,
  onConfirm,
  onCancel,
  titleClassName,
  descriptionClassName,
  headerLeading,
  className,
  children,
}: ConfirmationDialogProps & ConfirmationDialogContent) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(className)}>
        <DialogHeader
          className={cn(
            'mb-0',
            headerLeading != null && 'gap-0 space-y-0 sm:text-left',
          )}
        >
          {headerLeading != null ? (
            <div className="flex w-full items-start gap-4">
              <div className="shrink-0">{headerLeading}</div>
              <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                <DialogTitle className={titleClassName}>{title}</DialogTitle>
                <DialogDescription className={descriptionClassName}>
                  {description}
                </DialogDescription>
              </div>
            </div>
          ) : (
            <>
              <DialogTitle className={titleClassName}>{title}</DialogTitle>
              <DialogDescription className={descriptionClassName}>
                {description}
              </DialogDescription>
            </>
          )}
        </DialogHeader>
        {children}
        <DialogFooter>
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              {cancelButtonText ? cancelButtonText : t('Cancel')}
            </Button>
          )}
          <Button size="sm" variant={confirmButtonVariant} onClick={onConfirm}>
            {confirmButtonText ? confirmButtonText : t('Confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ConfirmationDialog };
