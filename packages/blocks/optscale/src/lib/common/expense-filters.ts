import { Property } from '@openops/blocks-framework';
import { OptScaleQueryValue } from './make-request';
import {
  cloudAccountsProperty,
  ownersFilterProperty,
  poolsFilterProperty,
} from './properties';

export const expenseFilterProperties = {
  cloudAccountIds: cloudAccountsProperty(),
  poolIds: poolsFilterProperty(),
  ownerIds: ownersFilterProperty(),
  regions: Property.Array({
    displayName: 'Regions',
    description: 'The regions to filter by, for example us-east-1',
    required: false,
  }),
  serviceNames: Property.Array({
    displayName: 'Services',
    description: 'The cloud services to filter by, for example AmazonEC2',
    required: false,
  }),
  tags: Property.Array({
    displayName: 'Tag Keys',
    description: 'Only include resources that have these tag keys',
    required: false,
  }),
};

export interface ExpenseFilterValues {
  cloudAccountIds?: unknown[];
  poolIds?: unknown[];
  ownerIds?: unknown[];
  regions?: unknown[];
  serviceNames?: unknown[];
  tags?: unknown[];
}

export function toExpenseFilterQuery(
  filters: ExpenseFilterValues,
): Record<string, OptScaleQueryValue> {
  return {
    cloud_account_id: toStringList(filters.cloudAccountIds),
    pool_id: toStringList(filters.poolIds),
    owner_id: toStringList(filters.ownerIds),
    region: toStringList(filters.regions),
    service_name: toStringList(filters.serviceNames),
    tag: toStringList(filters.tags),
  };
}

function toStringList(values?: unknown[]): string[] | undefined {
  const list = (values ?? [])
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);

  return list.length > 0 ? list : undefined;
}
