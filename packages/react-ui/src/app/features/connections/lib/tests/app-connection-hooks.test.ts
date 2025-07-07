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
        authProviderKey: undefined,
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
          authProviderKey: 'Slack',
        }),
        createConnection({
          id: 'slack-2',
          name: 'slack-2',
          type: AppConnectionType.CLOUD_OAUTH2,
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
      }),
      createConnection({
        id: '2',
        name: 'aws-provider',
      }),
      createConnection({
        id: '3',
        name: 'aws-athena-provider',
      }),
      createConnection({
        id: 'wGS7AXBwbDTr6BO7askqW',
        name: 'aws-test',
      }),
      createConnection({
        id: '4',
        name: 'aws-test1',
      }),
      createConnection({
        id: '5',
        name: 'slack',
        type: AppConnectionType.CLOUD_OAUTH2,
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
