import { Button } from '@openops/components/ui';
import { t } from 'i18next';

import { useBuilderStateContext } from '../builder-hooks';

export const TestStepSection = ({ stepName }: { stepName: string }) => {
  const isTrigger = stepName === 'trigger';
  const selectStepByName = useBuilderStateContext(
    (state) => state.selectStepByName,
  );

  return (
    <div className="flex flex-col gap-3 select-none text-center px-12 py-10 flex-grow items-center justify-center ">
      <div>
        {isTrigger
          ? t('You need to load data first for this trigger.')
          : t('You need to load data first for this step.')}
      </div>
      <div>
        <Button
          onClick={() => selectStepByName(stepName)}
          variant="default"
          size="default"
        >
          {isTrigger ? t('Go to Trigger') : t('Go to Step')}
        </Button>
      </div>
    </div>
  );
};
