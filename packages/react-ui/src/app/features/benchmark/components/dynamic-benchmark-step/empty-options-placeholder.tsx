import { t } from 'i18next';

export const EmptyOptionsPlaceholder = () => (
  <div className="px-4 py-6 text-sm text-muted-foreground text-center">
    {t('No options available. This step will be skipped.')}
  </div>
);
