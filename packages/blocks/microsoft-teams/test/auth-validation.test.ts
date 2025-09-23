import { microsoftTeamsAuth } from '../src/lib/common/microsoft-teams-auth';

const mockGet = jest.fn();

jest.mock('@openops/common', () => ({
  getMicrosoftGraphClient: jest.fn(() => ({
    api: jest.fn(() => ({
      get: mockGet,
    })),
  })),
}));

describe('microsoftTeamsAuth.validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return valid: true for valid credentials', async () => {
    if (microsoftTeamsAuth.validate) {
      const auth = { access_token: 'valid_token', data: {} };
      const result = await microsoftTeamsAuth.validate({ auth });

      expect(result).toEqual({ valid: true });
    }
  });

  test('should return valid: false for invalid credentials', async () => {
    if (microsoftTeamsAuth.validate) {
      mockGet.mockRejectedValue(new Error('Invalid token'));

      const auth = { access_token: 'invalid_token', data: {} };
      const result = await microsoftTeamsAuth.validate({ auth });

      expect(result).toEqual({ valid: false, error: 'Invalid Credentials.' });
    }
  });
});
