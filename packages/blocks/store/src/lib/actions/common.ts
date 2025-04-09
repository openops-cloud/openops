import { Property, StoreScope } from '@openops/blocks-framework';

export enum BlockStoreScope {
  PROJECT = 'COLLECTION',
  FLOW = 'FLOW',
  RUN = 'RUN',
}

export function getScopeAndKey(params: Params): {
  scope: StoreScope;
  key: string;
} {
  switch (params.scope) {
    case BlockStoreScope.PROJECT:
      return { scope: StoreScope.PROJECT, key: params.key };
    case BlockStoreScope.FLOW:
      return { scope: StoreScope.FLOW, key: params.key };
    case BlockStoreScope.RUN:
      return {
        scope: StoreScope.FLOW,
        key: `run_${params.runId}/${params.key}`,
      };
  }
}

type Params = {
  runId: string;
  key: string;
  scope: BlockStoreScope;
};

export const common = {
  store_scope: Property.StaticDropdown({
    displayName: 'Store Scope',
    description: 'The storage scope of the value.',
    required: true,
    options: {
      options: [
        {
          label: 'Within a single run of this workflow',
          value: BlockStoreScope.RUN,
        },
        {
          label: 'Between all runs of this workflow',
          value: BlockStoreScope.FLOW,
        },
        {
          label: 'Between all runs of all workflows',
          value: BlockStoreScope.PROJECT,
        },
      ],
    },
    defaultValue: BlockStoreScope.RUN,
  }),
};
