import { Button } from '@openops/components/ui';
import { t } from 'i18next';
import { TriangleAlertIcon } from 'lucide-react';
import { TestRunLimitsDialog } from '../test-run-limits/test-run-limits-dialog';

type TestRunActionLimitReachedPlateProps = {
  error: string;
};

const TestRunActionLimitReachedPlate = ({
  error,
}: TestRunActionLimitReachedPlateProps) => {
  return (
    <div className="w-fit flex flex-wrap items-center pl-[6px] text-destructive text-sm bg-warning-50 rounded-xs text-nowrap">
      <div className="flex items-center gap-1">
        <TriangleAlertIcon size={16} />
        <span>{error}</span>
      </div>
      <TestRunLimitsDialog>
        <Button
          variant="link"
          className="h-6 px-2 py-0 text-sm text-destructive font-medium underline"
        >
          {t('Configure limit')}
        </Button>
      </TestRunLimitsDialog>
    </div>
  );
};

export { TestRunActionLimitReachedPlate };
