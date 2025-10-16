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
  const [isOpen, setIsOpen] = useState(false);

  const { testRunActionLimits, blockActionMetaMap, isLoading, onSave } =
    useTestRunLimitsDialog();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="min-w-fit">
        <DialogHeader>
          <DialogTitle className="hidden">{t('Test run limits')}</DialogTitle>
        </DialogHeader>
        <TestRunLimitsForm
          value={testRunActionLimits}
          onSave={(v) => {
            setIsOpen(false);
            onSave(v);
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
