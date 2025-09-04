import { formatUtils } from '@/app/lib/utils';
import { FlowStatus, FlowVersionState } from '@openops/shared';
import { t } from 'i18next';
import { CheckIcon } from 'lucide-react';

export const NAME_FILTER = {
  type: 'input',
  title: t('Workflow name'),
  accessorKey: 'name',
  options: [],
  icon: CheckIcon,
} as const;

export const STATUS_FILTER = {
  type: 'select',
  title: t('Status'),
  accessorKey: 'status',
  options: Object.values(FlowStatus).map((status) => {
    return {
      label: formatUtils.convertEnumToHumanReadable(status),
      value: status,
    };
  }),
  icon: CheckIcon,
} as const;

export const VERSION_FILTER = {
  type: 'select',
  title: t('Version'),
  accessorKey: 'versionState',
  options: Object.values(FlowVersionState)
    .sort()
    .map((version) => {
      return {
        label: version === FlowVersionState.DRAFT ? t('Draft') : t('Locked'),
        value: version,
      };
    }),
  icon: CheckIcon,
} as const;

export const FLOWS_TABLE_FILTERS = [NAME_FILTER, STATUS_FILTER, VERSION_FILTER];
