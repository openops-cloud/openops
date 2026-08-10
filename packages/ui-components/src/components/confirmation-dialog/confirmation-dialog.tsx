import { t } from 'i18next';
import { Button } from '../../ui/button';
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
  children?: React.ReactNode;
};

export type ConfirmationDialogContent = {
  title: string;
  description: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
};

const ConfirmationDialog = ({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmButtonText,
  cancelButtonText,
  onConfirm,
  onCancel,
  titleClassName,
  descriptionClassName,
  children,
}: ConfirmationDialogProps & ConfirmationDialogContent) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="mb-0">
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
          <DialogDescription className={descriptionClassName}>
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              {cancelButtonText ? cancelButtonText : t('Cancel')}
            </Button>
          )}
          <Button size="sm" onClick={onConfirm}>
            {confirmButtonText ? confirmButtonText : t('Confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ConfirmationDialog };
