const mockList = jest.fn();
jest.mock(
  '../../../src/app/app-connection/app-connection-service/app-connection-service',
  () => ({
    appConnectionService: {
      list: (...args: unknown[]): ReturnType<typeof mockList> =>
        mockList(...args),
    },
  }),
);

jest.mock('../../../src/app/app-connection/app-connection-utils', () => ({
  removeSensitiveData: (conn: {
    id: string;
    name: string;
    authProviderKey: string;
  }): { id: string; name: string; authProviderKey: string } => ({
    id: conn.id,
    name: conn.name,
    authProviderKey: conn.authProviderKey,
  }),
}));

import type { StaticOptionValue } from '../../../src/app/benchmark/wizard-config-loader';
import {
  resolveListConnectionsOptions,
  resolveStaticOptions,
} from '../../../src/app/benchmark/wizard-option-resolvers';

describe('wizard-option-resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveStaticOptions', () => {
    it('maps static values to options with id, displayName, imageLogoUrl', () => {
      const values: StaticOptionValue[] = [
        { id: 'opt-1', displayName: 'Option One' },
        {
          id: 'opt-2',
          displayName: 'Option Two',
          imageLogoUrl: 'https://example.com/logo.png',
        },
      ];

      const result = resolveStaticOptions(values);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'opt-1',
        displayName: 'Option One',
        imageLogoUrl: undefined,
      });
      expect(result[1]).toEqual({
        id: 'opt-2',
        displayName: 'Option Two',
        imageLogoUrl: 'https://example.com/logo.png',
      });
    });

    it('returns empty array for empty values', () => {
      const result = resolveStaticOptions([]);
      expect(result).toEqual([]);
    });

    it('uses undefined for missing imageLogoUrl', () => {
      const values: StaticOptionValue[] = [
        { id: 'id-only', displayName: 'No Logo' },
      ];
      const result = resolveStaticOptions(values);
      expect(result[0].imageLogoUrl).toBeUndefined();
    });
  });

  describe('resolveListConnectionsOptions', () => {
    const projectId = 'project-1';
    const provider = 'aws';

    it('calls appConnectionService.list with correct params and maps to options', async () => {
      mockList.mockResolvedValue({
        data: [
          { id: 'conn-1', name: 'AWS Prod', authProviderKey: 'aws' },
          { id: 'conn-2', name: 'AWS Staging', authProviderKey: 'aws' },
        ],
        cursor: null,
      });

      const result = await resolveListConnectionsOptions(provider, projectId);

      expect(mockList).toHaveBeenCalledTimes(1);
      expect(mockList).toHaveBeenCalledWith({
        projectId,
        cursorRequest: null,
        name: undefined,
        status: expect.any(Array),
        limit: 100,
        authProviders: ['aws'],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'conn-1',
        displayName: 'AWS Prod',
        imageLogoUrl: undefined,
        metadata: { authProviderKey: 'aws' },
      });
      expect(result[1]).toEqual({
        id: 'conn-2',
        displayName: 'AWS Staging',
        imageLogoUrl: undefined,
        metadata: { authProviderKey: 'aws' },
      });
    });

    it('lowercases provider for authProviders', async () => {
      mockList.mockResolvedValue({ data: [], cursor: null });

      await resolveListConnectionsOptions('AWS', projectId);

      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ authProviders: ['aws'] }),
      );
    });

    it('returns empty options when list returns no data', async () => {
      mockList.mockResolvedValue({ data: [], cursor: null });

      const result = await resolveListConnectionsOptions(provider, projectId);

      expect(result).toEqual([]);
    });
  });
});
