import { t } from 'i18next';
import { CircleCheck, CircleMinus } from 'lucide-react';

type AiConfigIndicatorProps = {
  enabled: boolean;
};

const AiConfigIndicator = ({ enabled }: AiConfigIndicatorProps) => {
  return (
    <div className="flex items-center gap-[6px] text-primary-900 font-medium">
      {enabled ? (
        <>
          <CircleCheck className="text-success-300" size={24} />
          <span>{t('OpenOps AI is enabled')}</span>
        </>
      ) : (
        <>
          <CircleMinus className="text-muted-foreground" size={24} />
          <span>
            {t('OpenOps AI is disabled - Configure a connection to enable it')}
          </span>
        </>
      )}
    </div>
  );
};

export { AiConfigIndicator };
