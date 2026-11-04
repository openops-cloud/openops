import { HttpMethod } from '@openops/blocks-common';
import { sendOptScaleRequest } from '../../src/lib/common/make-request';
import {
  cloudAccountsProperty,
  employeeProperty,
  loadCloudAccountOptions,
  loadEmployeeOptions,
  loadOrganizationOptions,
  loadPoolOptions,
  organizationProperty,
  poolProperty,
} from '../../src/lib/common/properties';

jest.mock('../../src/lib/common/make-request', () => ({
  ...jest.requireActual('../../src/lib/common/make-request'),
  sendOptScaleRequest: jest.fn(),
}));

const sendMock = sendOptScaleRequest as jest.Mock;
const auth = {
  baseUrl: 'https://optscale.example.com',
  email: 'user@example.com',
  password: 'secret',
};

describe('organization dropdown', () => {
  beforeEach(() => jest.clearAllMocks());

  test('is disabled without auth', async () => {
    await expect(loadOrganizationOptions({})).resolves.toEqual({
      disabled: true,
      options: [],
      placeholder: 'Please authenticate first',
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  test('lists organizations', async () => {
    sendMock.mockResolvedValue({
      organizations: [{ id: 'org-1', name: 'Org One' }],
    });

    await expect(loadOrganizationOptions({ auth })).resolves.toEqual({
      disabled: false,
      options: [{ label: 'Org One', value: 'org-1' }],
    });
    expect(sendMock).toHaveBeenCalledWith({
      auth,
      method: HttpMethod.GET,
      path: '/organizations',
    });
  });

  test('shows an error placeholder when the request fails', async () => {
    sendMock.mockRejectedValue(new Error('boom'));

    await expect(loadOrganizationOptions({ auth })).resolves.toEqual({
      disabled: true,
      options: [],
      placeholder: 'Could not fetch organizations',
      error: 'boom',
    });
  });

  test('is a required dropdown refreshed by auth', () => {
    expect(organizationProperty).toMatchObject({
      type: 'DROPDOWN',
      required: true,
      refreshers: ['auth'],
    });
  });
});

describe('organization scoped dropdowns', () => {
  beforeEach(() => jest.clearAllMocks());

  test.each([
    ['data sources', loadCloudAccountOptions],
    ['pools', loadPoolOptions],
    ['employees', loadEmployeeOptions],
  ])('%s dropdown requires auth and organization', async (_, load) => {
    await expect(load({ organizationId: 'org-1' })).resolves.toMatchObject({
      disabled: true,
      placeholder: 'Please authenticate first',
    });
    await expect(load({ auth })).resolves.toMatchObject({
      disabled: true,
      placeholder: 'Please select an organization first',
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  test('lists data sources with their type', async () => {
    sendMock.mockResolvedValue({
      cloud_accounts: [{ id: 'ca-1', name: 'Prod', type: 'aws_cnr' }],
    });

    await expect(
      loadCloudAccountOptions({ auth, organizationId: 'org-1' }),
    ).resolves.toEqual({
      disabled: false,
      options: [{ label: 'Prod (aws_cnr)', value: 'ca-1' }],
    });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/organizations/org-1/cloud_accounts',
      }),
    );
  });

  test('lists pools by full name, falling back to name', async () => {
    sendMock.mockResolvedValue({
      pools: [
        { id: 'p-1', name: 'Frontend', full_name: 'Dev->Frontend' },
        { id: 'p-2', name: 'Root' },
      ],
    });

    await expect(
      loadPoolOptions({ auth, organizationId: 'org-1' }),
    ).resolves.toEqual({
      disabled: false,
      options: [
        { label: 'Dev->Frontend', value: 'p-1' },
        { label: 'Root', value: 'p-2' },
      ],
    });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/organizations/org-1/pools' }),
    );
  });

  test('lists employees', async () => {
    sendMock.mockResolvedValue({
      employees: [{ id: 'e-1', name: 'Team Member' }],
    });

    await expect(
      loadEmployeeOptions({ auth, organizationId: 'org-1' }),
    ).resolves.toEqual({
      disabled: false,
      options: [{ label: 'Team Member', value: 'e-1' }],
    });
  });

  test('shows the entity in the error placeholder', async () => {
    sendMock.mockRejectedValue(new Error('denied'));

    await expect(
      loadPoolOptions({ auth, organizationId: 'org-1' }),
    ).resolves.toEqual({
      disabled: true,
      options: [],
      placeholder: 'Could not fetch pools',
      error: 'denied',
    });
  });

  test('property factories refresh on auth and organization', () => {
    for (const property of [
      cloudAccountsProperty(),
      poolProperty('Pool', 'desc'),
      employeeProperty('Owner', 'desc'),
    ]) {
      expect(property.refreshers).toEqual(['auth', 'organizationId']);
    }
    expect(cloudAccountsProperty()).toMatchObject({
      type: 'MULTI_SELECT_DROPDOWN',
      required: false,
    });
  });
});
