import type { SeekPage } from '@openops/shared';
import {
  AppConnectionStatus,
  AppConnectionType,
  AppConnectionWithoutSensitiveData,
} from '@openops/shared';
import { groupedConnectionsSelector } from '../app-connections-hooks';

function createConnection(
  overrides: Partial<AppConnectionWithoutSensitiveData> = {},
): AppConnectionWithoutSensitiveData {
  return {
    id: 'default-id',
    created: '2025-06-01T00:00:00.000Z',
    updated: '2025-06-01T00:00:00.000Z',
    name: 'default',
    type: AppConnectionType.CUSTOM_AUTH,
    blockName: '@openops/block-aws',
    projectId: 'HUvbevoLCGQX5hOHeRthU',
    status: AppConnectionStatus.ACTIVE,
    authProviderKey: 'AWS',
    ...overrides,
  } as AppConnectionWithoutSensitiveData;
}

describe('groupedConnectionsSelector', () => {
  it('throws if missing authProviderKey', () => {
    const connections: AppConnectionWithoutSensitiveData[] = [
      createConnection({
        id: 'missing-aws',
        name: 'aws-missing-provider',
        authProviderKey: undefined,
      }),
      createConnection({
        id: 'missing-slack',
        name: 'slack-missing-provider',
        type: AppConnectionType.CLOUD_OAUTH2,
        // blockName: '@openops/block-slack',
        authProviderKey: null,
      }),
    ];
    const page: SeekPage<AppConnectionWithoutSensitiveData> = {
      data: connections,
      next: null,
      previous: null,
    };
    expect(() => groupedConnectionsSelector(page)).toThrow();
  });

  it('returns empty object for empty data', () => {
    const page: SeekPage<AppConnectionWithoutSensitiveData> = {
      data: [],
      next: null,
      previous: null,
    };
    const result = groupedConnectionsSelector(page);
    expect(result).toEqual({});
  });

  it.each([
    [
      'groups multiple AWS connections with same blockName and provider',
      [
        createConnection({ id: 'aws-1', name: 'aws-1' }),
        createConnection({ id: 'aws-2', name: 'aws-2' }),
      ],
      'AWS',
      2,
    ],
    [
      'groups multiple Slack connections with same blockName and provider',
      [
        createConnection({
          id: 'slack-1',
          name: 'slack-1',
          type: AppConnectionType.CLOUD_OAUTH2,
          // blockName: '@openops/block-slack',
          authProviderKey: 'Slack',
        }),
        createConnection({
          id: 'slack-2',
          name: 'slack-2',
          type: AppConnectionType.CLOUD_OAUTH2,
          // blockName: '@openops/block-slack',
          authProviderKey: 'Slack',
        }),
      ],
      'Slack',
      2,
    ],
  ])('%s', (_desc, connections, authProviderKey, expectedLength) => {
    const page: SeekPage<AppConnectionWithoutSensitiveData> = {
      data: connections,
      next: null,
      previous: null,
    };
    const result = groupedConnectionsSelector(page);
    expect(Object.keys(result)).toEqual([authProviderKey]);
    expect(result[authProviderKey]).toHaveLength(expectedLength);
    expect(result[authProviderKey]).toEqual(connections);
  });

  it('groups connections by authProviderKey and blockName', () => {
    const connections: AppConnectionWithoutSensitiveData[] = [
      createConnection({
        id: '1',
        name: 'aws',
        // blockName: '@openops/block-aws',
      }),
      createConnection({
        id: '2',
        name: 'aws-provider',
        // blockName: '@openops/block-aws',
      }),
      createConnection({
        id: '3',
        name: 'aws-athena-provider',
        // blockName: '@openops/block-aws-athena',
      }),
      createConnection({
        id: 'wGS7AXBwbDTr6BO7askqW',
        name: 'aws-test',
        // blockName: '@openops/block-aws',
      }),
      createConnection({
        id: '4',
        name: 'aws-test1',
        // blockName: '@openops/block-aws',
      }),
      createConnection({
        id: '5',
        name: 'slack',
        type: AppConnectionType.CLOUD_OAUTH2,
        // blockName: '@openops/block-slack',
        authProviderKey: 'Slack',
      }),
    ];
    const page: SeekPage<AppConnectionWithoutSensitiveData> = {
      data: connections,
      next: null,
      previous: null,
    };
    const result = groupedConnectionsSelector(page);
    expect(result).toEqual({
      AWS: [
        connections[0],
        connections[1],
        connections[2],
        connections[3],
        connections[4],
      ],
      Slack: [connections[5]],
    });
  });
});
