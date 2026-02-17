import {
  Wizard,
  WizardClose,
  WizardContent,
  WizardHeader,
  WizardTitle,
} from '@openops/components/ui';
import { t } from 'i18next';
import { noop } from 'lodash-es';

interface BenchmarkWizardProps {
  onClose: () => void;
}

export const BenchmarkWizard = ({ onClose }: BenchmarkWizardProps) => {
  return (
    <div className="h-full w-full flex flex-col bg-greyBlue-100 dark:bg-background">
      <Wizard onValueChange={noop} className="border-l-0 border-t-0">
        <WizardHeader className="min-h-[60px] border-gray-200">
          <WizardTitle>{t('Run a Benchmark')}</WizardTitle>
          <WizardClose onClose={onClose} />
        </WizardHeader>

        <WizardContent className="max-h-[358px]"></WizardContent>
      </Wizard>
    </div>
  );
};
