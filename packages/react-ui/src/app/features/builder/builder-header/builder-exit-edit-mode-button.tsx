import { SEARCH_PARAMS } from '@/app/constants/search-params';
import { Button, TooltipWrapper } from '@openops/components/ui';
import { t } from 'i18next';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const BuilderExitEditModeButton = () => {
  const [, setSearchParams] = useSearchParams();

  const onExitEditMode = useCallback(() => {
    setSearchParams(
      (params) => {
        params.set(SEARCH_PARAMS.viewOnly, 'true');
        return params;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return (
    <TooltipWrapper tooltipText={t('Exit edit mode')}>
      <Button
        variant="default"
        size="lg"
        className="h-[42px] rounded-lg text-base font-bold shadow-editor"
        onClick={onExitEditMode}
      >
        {t('Exit')}
      </Button>
    </TooltipWrapper>
  );
};

export { BuilderExitEditModeButton };
