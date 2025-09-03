import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@openops/components/ui';
import { t } from 'i18next';
import { ReactNode } from 'react';

type StopRunDialogProps = {
  isStopDialogOpen: boolean;
  setIsStopDialogOpen: (isStopDialogOpen: boolean) => void;
  stopRun: () => void;
  children: ReactNode;
};

const StopRunDialog = ({
  isStopDialogOpen,
  setIsStopDialogOpen,
  stopRun,
  children,
}: StopRunDialogProps) => {
  return (
    <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader className="mb-0">
          <DialogTitle className="text-primary text-[22px]">
            {t('Are you sure you want to stop this run?')}
          </DialogTitle>
          <DialogDescription className="text-primary text-[16px]">
            {t(
              'Stopping this workflow may leave some steps unfinished. Consider whether stopping the execution is necessary.',
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setIsStopDialogOpen(false)}
          >
            {t('Cancel')}
          </Button>
          <Button
            size="lg"
            onClick={() => {
              stopRun();
            }}
          >
            {t('Stop Run')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

StopRunDialog.displayName = 'StopRunDialog';
export { StopRunDialog };
