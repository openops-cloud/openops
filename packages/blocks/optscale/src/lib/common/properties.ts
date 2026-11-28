import { HttpMethod } from '@openops/blocks-common';
import {
  DropdownProperty,
  DropdownState,
  MultiSelectDropdownProperty,
  Property,
} from '@openops/blocks-framework';
import { OptScaleAuth, pathSegment, sendOptScaleRequest } from './make-request';

interface NamedEntity {
  id: string;
  name: string;
}

type DropdownOption = { label: string; value: string };

const unauthenticatedState: DropdownState<string> = {
  disabled: true,
  options: [],
  placeholder: 'Please authenticate first',
};

async function toDropdownState(
  entityName: string,
  load: () => Promise<DropdownOption[]>,
): Promise<DropdownState<string>> {
  try {
    return { disabled: false, options: await load() };
  } catch (error) {
    return {
      disabled: true,
      options: [],
      placeholder: `Could not fetch ${entityName}`,
      error: (error as Error).message,
    };
  }
}

type DropdownOptionsLoader = (
  propsValue: Record<string, unknown>,
) => Promise<DropdownState<string>>;

function organizationScopedOptions(
  entityName: string,
  load: (
    auth: OptScaleAuth,
    organizationId: string,
  ) => Promise<DropdownOption[]>,
): DropdownOptionsLoader {
  return async ({
    auth,
    organizationId,
  }: Record<string, unknown>): Promise<DropdownState<string>> => {
    if (!auth) {
      return unauthenticatedState;
    }

    if (!organizationId) {
      return {
        disabled: true,
        options: [],
        placeholder: 'Please select an organization first',
      };
    }

    return toDropdownState(entityName, () =>
      load(auth as OptScaleAuth, organizationId as string),
    );
  };
}

export const loadOrganizationOptions = async ({
  auth,
}: Record<string, unknown>): Promise<DropdownState<string>> => {
  if (!auth) {
    return unauthenticatedState;
  }

  return toDropdownState('organizations', async () => {
    const { organizations } = await sendOptScaleRequest<{
      organizations: NamedEntity[];
    }>({
      auth: auth as OptScaleAuth,
      method: HttpMethod.GET,
      path: '/organizations',
    });

    return organizations.map((org) => ({ label: org.name, value: org.id }));
  });
};

export const loadCloudAccountOptions = organizationScopedOptions(
  'data sources',
  async (auth, organizationId) => {
    const { cloud_accounts } = await sendOptScaleRequest<{
      cloud_accounts: (NamedEntity & { type: string })[];
    }>({
      auth,
      method: HttpMethod.GET,
      path: `/organizations/${pathSegment(organizationId)}/cloud_accounts`,
    });

    return cloud_accounts.map((account) => ({
      label: `${account.name} (${account.type})`,
      value: account.id,
    }));
  },
);

export const loadPoolOptions = organizationScopedOptions(
  'pools',
  async (auth, organizationId) => {
    const { pools } = await sendOptScaleRequest<{
      pools: (NamedEntity & { full_name?: string })[];
    }>({
      auth,
      method: HttpMethod.GET,
      path: `/organizations/${pathSegment(organizationId)}/pools`,
    });

    return pools.map((pool) => ({
      label: pool.full_name ?? pool.name,
      value: pool.id,
    }));
  },
);

export const loadEmployeeOptions = organizationScopedOptions(
  'employees',
  async (auth, organizationId) => {
    const { employees } = await sendOptScaleRequest<{
      employees: NamedEntity[];
    }>({
      auth,
      method: HttpMethod.GET,
      path: `/organizations/${pathSegment(organizationId)}/employees`,
    });

    return employees.map((employee) => ({
      label: employee.name,
      value: employee.id,
    }));
  },
);

export const organizationProperty = Property.Dropdown<string, true>({
  displayName: 'Organization',
  description: 'The OptScale organization',
  required: true,
  refreshers: ['auth'],
  options: loadOrganizationOptions,
});

function filterProperty(
  displayName: string,
  description: string,
  options: DropdownOptionsLoader,
): MultiSelectDropdownProperty<string, false> {
  return Property.MultiSelectDropdown<string, false>({
    displayName,
    description,
    required: false,
    refreshers: ['auth', 'organizationId'],
    options,
  });
}

export function cloudAccountsProperty(): MultiSelectDropdownProperty<
  string,
  false
> {
  return filterProperty(
    'Data Sources',
    'The cloud accounts (data sources) to filter by. Leave empty to include all.',
    loadCloudAccountOptions,
  );
}

export function poolsFilterProperty(): MultiSelectDropdownProperty<
  string,
  false
> {
  return filterProperty(
    'Pools',
    'The pools to filter by. Leave empty to include all.',
    loadPoolOptions,
  );
}

export function ownersFilterProperty(): MultiSelectDropdownProperty<
  string,
  false
> {
  return filterProperty(
    'Owners',
    'The resource owners (employees) to filter by. Leave empty to include all.',
    loadEmployeeOptions,
  );
}

export function poolProperty(
  displayName: string,
  description: string,
): DropdownProperty<string, true> {
  return Property.Dropdown<string, true>({
    displayName,
    description,
    required: true,
    refreshers: ['auth', 'organizationId'],
    options: loadPoolOptions,
  });
}

export function employeeProperty(
  displayName: string,
  description: string,
): DropdownProperty<string, true> {
  return Property.Dropdown<string, true>({
    displayName,
    description,
    required: true,
    refreshers: ['auth', 'organizationId'],
    options: loadEmployeeOptions,
  });
}
