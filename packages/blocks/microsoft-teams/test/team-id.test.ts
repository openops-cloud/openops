import { PropertyContext } from '@openops/blocks-framework';
import { teamId } from '../src/lib/common/team-id';

const mockGet = jest.fn(() => ({
  value: [
    { id: '1', displayName: 'Team A' },
    { id: '2', displayName: 'Team B' },
  ],
}));

jest.mock('@openops/common', () => ({
  ...jest.requireActual('@openops/common'),
  getMicrosoftGraphClient: jest.fn(() => ({
    api: jest.fn(() => ({
      get: mockGet,
    })),
  })),
}));

describe('microsoftTeamsCommon.teamId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return a list of teams', async () => {
    const auth = { access_token: 'valid_token', data: {} };
    const result = await teamId.options({ auth }, {} as PropertyContext);

    expect(result).toEqual({
      disabled: false,
      options: [
        { label: 'Team A', value: '1' },
        { label: 'Team B', value: '2' },
      ],
    });
  });

  test('should return disabled with a message if auth is missing', async () => {
    const result = await teamId.options({ auth: null }, {} as PropertyContext);
    expect(result).toEqual({
      disabled: true,
      placeholder: 'Please connect your account first.',
      options: [],
    });
  });
});
