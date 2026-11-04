import { HttpMethod } from '@openops/blocks-common';
import { DropdownState, Property } from '@openops/blocks-framework';
import { OptScaleAuth, sendOptScaleRequest } from './make-request';

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

function organizationScopedOptions(
  entityName: string,
  load: (
    auth: OptScaleAuth,
    organizationId: string,
  ) => Promise<DropdownOption[]>,
) {
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
      path: `/organizations/${organizationId}/cloud_accounts`,
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
      path: `/organizations/${organizationId}/pools`,
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
      path: `/organizations/${organizationId}/employees`,
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

export function cloudAccountsProperty() {
  return Property.MultiSelectDropdown<string, false>({
    displayName: 'Data Sources',
    description:
      'The cloud accounts (data sources) to filter by. Leave empty to include all.',
    required: false,
    refreshers: ['auth', 'organizationId'],
    options: loadCloudAccountOptions,
  });
}

export function poolProperty(displayName: string, description: string) {
  return Property.Dropdown<string, true>({
    displayName,
    description,
    required: true,
    refreshers: ['auth', 'organizationId'],
    options: loadPoolOptions,
  });
}

export function employeeProperty(displayName: string, description: string) {
  return Property.Dropdown<string, true>({
    displayName,
    description,
    required: true,
    refreshers: ['auth', 'organizationId'],
    options: loadEmployeeOptions,
  });
}
