const getSerializedObjectMock = jest.fn();
const setSerializedObjectMock = jest.fn();
const getInternalApiUrlMock = jest.fn();
const fetchMock = jest.fn();

jest.mock('@openops/server-shared', () => ({
  cacheWrapper: {
    getSerializedObject: getSerializedObjectMock,
    setSerializedObject: setSerializedObjectMock,
  },
  networkUtls: {
    getInternalApiUrl: getInternalApiUrlMock,
  },
}));

global.fetch = fetchMock;

import { getFeatureFlag } from '../src/get-feature-flag';
import { FlagId } from '@openops/shared';
describe('getFeatureFlag', () => {
  const engineToken = 'test-engine-token';
  const mockApiUrl = 'https://api.example.com/';

  beforeEach(() => {
    jest.clearAllMocks();
    getInternalApiUrlMock.mockReturnValue(mockApiUrl);
  });

  describe('cache hit scenario', () => {
    it('should return flag value from cache when available', async () => {
      const mockFeatureFlags = {
        [FlagId.ENVIRONMENT]: 'production',
        [FlagId.EDITION]: 'enterprise',
      };
      getSerializedObjectMock.mockResolvedValue(mockFeatureFlags);

      const result1 = await getFeatureFlag(engineToken, FlagId.ENVIRONMENT);
      const result2 = await getFeatureFlag(engineToken, FlagId.EDITION);

      expect(result1).toBe('production');
      expect(result2).toBe('enterprise');

      expect(getSerializedObjectMock).toHaveBeenCalledTimes(2);
      expect(getSerializedObjectMock).toHaveBeenCalledWith('FeatureFlags');

      expect(fetchMock).not.toHaveBeenCalled();
      expect(setSerializedObjectMock).not.toHaveBeenCalled();
    });

    it('should handle different types of flag values from cache', async () => {
      const mockFeatureFlags = {
        [FlagId.ENVIRONMENT]: 'production',
        [FlagId.PROJECT_LIMITS_ENABLED]: true,
        [FlagId.FLOW_RUN_TIME_SECONDS]: 300,
        [FlagId.THEME]: { dark: true, color: 'blue' },
      };
      getSerializedObjectMock.mockResolvedValue(mockFeatureFlags);

      const stringResult = await getFeatureFlag(engineToken, FlagId.ENVIRONMENT);
      const boolResult = await getFeatureFlag(engineToken, FlagId.PROJECT_LIMITS_ENABLED);
      const numberResult = await getFeatureFlag(engineToken, FlagId.FLOW_RUN_TIME_SECONDS);
      const objectResult = await getFeatureFlag(engineToken, FlagId.THEME);

      expect(stringResult).toBe('production');
      expect(boolResult).toBe(true);
      expect(numberResult).toBe(300);
      expect(objectResult).toEqual({ dark: true, color: 'blue' });
    });
  });

  describe('cache miss scenario', () => {
    it('should fetch flags from API when not in cache', async () => {
      getSerializedObjectMock.mockResolvedValue(null);

      const mockApiResponse = {
        [FlagId.ENVIRONMENT]: 'development',
        [FlagId.CLOUD_AUTH_ENABLED]: true,
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const result = await getFeatureFlag(engineToken, FlagId.ENVIRONMENT);

      expect(result).toBe('development');
      expect(getSerializedObjectMock).toHaveBeenCalledWith('FeatureFlags');
      expect(fetchMock).toHaveBeenCalledWith(`${mockApiUrl}v1/flags`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${engineToken}`,
        },
      });
      expect(setSerializedObjectMock).toHaveBeenCalledWith('FeatureFlags', mockApiResponse);
    });

    it('should handle API errors gracefully', async () => {
      getSerializedObjectMock.mockResolvedValue(null);

      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(getFeatureFlag(engineToken, FlagId.ENVIRONMENT))
        .rejects
        .toThrow('Failed to get feature flags from the API.');

      expect(getSerializedObjectMock).toHaveBeenCalledWith('FeatureFlags');
      expect(fetchMock).toHaveBeenCalledWith(`${mockApiUrl}v1/flags`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${engineToken}`,
        },
      });
      expect(setSerializedObjectMock).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      getSerializedObjectMock.mockResolvedValue(null);

      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(getFeatureFlag(engineToken, FlagId.ENVIRONMENT))
        .rejects
        .toThrow('Network error');

      expect(getSerializedObjectMock).toHaveBeenCalledWith('FeatureFlags');
      expect(fetchMock).toHaveBeenCalledWith(`${mockApiUrl}v1/flags`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${engineToken}`,
        },
      });

      expect(setSerializedObjectMock).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should return undefined for non-existent flag IDs', async () => {
      const mockFeatureFlags = {
        [FlagId.ENVIRONMENT]: 'production',
      };
      getSerializedObjectMock.mockResolvedValue(mockFeatureFlags);

      const result = await getFeatureFlag(engineToken, FlagId.EDITION);

      expect(result).toBeUndefined();
    });

    it('should handle empty API response', async () => {
      getSerializedObjectMock.mockResolvedValue(null);

      fetchMock.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      const result = await getFeatureFlag(engineToken, FlagId.ENVIRONMENT);

      expect(result).toBeUndefined();
      expect(setSerializedObjectMock).toHaveBeenCalledWith('FeatureFlags', {});
    });
  });
});
