import { Property } from '@openops/blocks-framework';
import { sendTernaryRequest } from '../../src/lib/common/send-ternary-request';
import { getUsersIDsDropdownProperty } from '../../src/lib/common/users';

jest.mock('../../src/lib/common', () => ({
  sendTernaryRequest: jest.fn(),
}));

jest.mock('@openops/blocks-framework', () => ({
  Property: {
    MultiSelectDropdown: jest.fn().mockReturnValue('mocked-property'),
  },
}));

describe('getUsersIDsDropdownProperty', () => {
  const mockAuth = {
    apiKey: 'valid-jwt-token',
    tenantId: 'test-tenant-id',
    apiURL: 'https://api.test.com',
  };

  const mockUsersList = {
    users: [
      { email: 'user1@example.com', id: 'user1-id' },
      { email: 'user2@example.com', id: 'user2-id' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (sendTernaryRequest as jest.Mock).mockResolvedValue({
      body: mockUsersList,
    });
  });

  it('should return a MultiSelectDropdown property', () => {
    getUsersIDsDropdownProperty('Test Users');

    expect(Property.MultiSelectDropdown).toHaveBeenCalledWith({
      displayName: 'Test Users',
      description: 'Select one or more users from the list',
      refreshers: ['auth'],
      required: false,
      options: expect.any(Function),
    });
  });

  it('should set required to true when specified', () => {
    getUsersIDsDropdownProperty('Test Users', true);

    expect(Property.MultiSelectDropdown).toHaveBeenCalledWith(
      expect.objectContaining({
        required: true,
      }),
    );
  });

  it('should return disabled options when auth is not provided', async () => {
    getUsersIDsDropdownProperty('Test Users');
    const optionsFunction = (Property.MultiSelectDropdown as jest.Mock).mock
      .calls[0][0].options;

    const result = await optionsFunction({});

    expect(result).toEqual({
      disabled: true,
      options: [],
      placeholder: 'Please authenticate first',
    });

    expect(sendTernaryRequest).not.toHaveBeenCalled();
  });

  it('should return user options when auth is provided', async () => {
    getUsersIDsDropdownProperty('Test Users');
    const optionsFunction = (Property.MultiSelectDropdown as jest.Mock).mock
      .calls[0][0].options;

    const result = await optionsFunction({ auth: mockAuth });

    expect(sendTernaryRequest).toHaveBeenCalledWith({
      auth: mockAuth,
      method: 'GET',
      url: 'users',
      queryParams: {
        tenantID: mockAuth.tenantId,
        includeSettings: 'false',
      },
    });

    expect(result).toEqual({
      options: [
        { label: 'user1@example.com', value: 'user1-id' },
        { label: 'user2@example.com', value: 'user2-id' },
      ],
    });
  });

  it('should return error state when getUsersList throws an error', async () => {
    const errorMessage = 'Failed to fetch users';
    (sendTernaryRequest as jest.Mock).mockRejectedValue(
      new Error(errorMessage),
    );

    getUsersIDsDropdownProperty('Test Users');
    const optionsFunction = (Property.MultiSelectDropdown as jest.Mock).mock
      .calls[0][0].options;

    const result = await optionsFunction({ auth: mockAuth });

    expect(result).toEqual({
      options: [],
      disabled: true,
      placeholder: 'An error occurred while fetching the users list',
      error: `Error: ${errorMessage}`,
    });
  });
});
