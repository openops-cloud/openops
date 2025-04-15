import { databricksAuth } from '../src/lib/common/auth';
import { getDatabricksToken } from '../src/lib/common/get-databricks-token';

jest.mock('../src/lib/common/get-databricks-token', () => ({
  getDatabricksToken: jest.fn(),
}));

const getDatabricksTokenMock = getDatabricksToken as jest.Mock;

const auth = { accountId: 'id', clientId: 'id', clientSecret: 'secret' };

describe('databricks.validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return valid: true for valid credentials', async () => {
    if (databricksAuth.validate) {
      getDatabricksTokenMock.mockResolvedValue('access_token');
      const result = await databricksAuth.validate({ auth });

      expect(result).toEqual({ valid: true });
    }
  });

  test('should return valid: false when no access token', async () => {
    if (databricksAuth.validate) {
      getDatabricksTokenMock.mockResolvedValue(null);
      const result = await databricksAuth.validate({ auth });

      expect(result).toEqual({
        valid: false,
        error: 'Error validating API access.',
      });
    }
  });

  test('should return valid: false when request failed', async () => {
    if (databricksAuth.validate) {
      getDatabricksTokenMock.mockRejectedValue(new Error('Error'));
      const result = await databricksAuth.validate({ auth });

      expect(result).toEqual({
        valid: false,
        error: 'Error validating API access.',
      });
    }
  });
});
