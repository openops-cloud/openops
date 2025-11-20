import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { FlagId, OpsEdition } from '@openops/shared';
import { t } from 'i18next';

export const useAssistantName = () => {
  const edition = flagsHooks.useFlag<OpsEdition>(FlagId.EDITION).data;
  return edition === OpsEdition.COMMUNITY
    ? t('OpenOps Assistant')
    : t('OpenOps Agent');
};
