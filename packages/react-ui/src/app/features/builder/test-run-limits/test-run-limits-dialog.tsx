import { useTestRunLimitsDialog } from '@/app/features/builder/test-run-limits/test-run-limits-dialog-hook';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  TestRunLimitsForm,
} from '@openops/components/ui';
import { t } from 'i18next';
import React, { useState } from 'react';

type TestRunLimitsDialogProps = {
  children: React.ReactNode;
};

const TestRunLimitsDialog = ({ children }: TestRunLimitsDialogProps) => {
  const [isOpen, setOpen] = useState(false);

  const { testRunLimitSettings, blockActionMetaMap, isLoading } =
    useTestRunLimitsDialog();

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="min-w-fit">
        <DialogHeader>
          <DialogTitle className="text-primary text-[22px] font-bold">
            {t('Test run limits')}
          </DialogTitle>
        </DialogHeader>
        <TestRunLimitsForm
          value={testRunLimitSettings}
          onSave={(v) => {
            console.log('THE VALUE IS ', v);
            setOpen(false);
          }}
          blockActionMetaMap={blockActionMetaMap}
          isLoading={isLoading}
          className="max-w-2xl"
        />
      </DialogContent>
    </Dialog>
  );
};

TestRunLimitsDialog.displayName = 'TestRunLimitsDialog';

export { TestRunLimitsDialog };
