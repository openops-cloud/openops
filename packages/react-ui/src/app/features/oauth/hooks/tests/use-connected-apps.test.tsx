import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { ConnectedApp, oauthApi } from '../../lib/oauth-api';
import { useConnectedApps } from '../use-connected-apps';

jest.mock('../../lib/oauth-api', () => ({
  oauthApi: { listConnectedApps: jest.fn(), revokeConnectedApp: jest.fn() },
}));

const mockedList = oauthApi.listConnectedApps as jest.Mock;
const mockedRevoke = oauthApi.revokeConnectedApp as jest.Mock;

const app = (id: string, clientName = 'Claude Code'): ConnectedApp => ({
  id,
  clientName,
  resourceId: 'mcp',
  created: '2026-07-01T10:00:00.000Z',
  lastUsedAt: null,
});

// Retries are disabled here only to keep the failure cases fast. Unlike the consent
// request, which is single-use and opts out in the hook, retrying this list is
// reasonable behaviour — it just is not what these tests are about.
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const render = () => renderHook(() => useConnectedApps(), { wrapper });

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockResolvedValue([app('grant-1'), app('grant-2')]);
  mockedRevoke.mockResolvedValue(undefined);
});

describe('useConnectedApps', () => {
  it('lists the connections the user has granted', async () => {
    const { result } = render();

    await waitFor(() => expect(result.current.apps).toHaveLength(2));
    expect(result.current.apps?.map((a) => a.id)).toEqual([
      'grant-1',
      'grant-2',
    ]);
  });

  it('revokes only the connection asked for', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.apps).toHaveLength(2));

    await act(async () => result.current.revoke('grant-2'));

    // Two rows can belong to the same application, so the id is what identifies
    // which authorization to cut off. react-query passes its own context as a second
    // argument, so only the first is asserted.
    expect(mockedRevoke).toHaveBeenCalledTimes(1);
    expect(mockedRevoke.mock.calls[0][0]).toBe('grant-2');
  });

  it('refetches the list after revoking so the row disappears', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.apps).toHaveLength(2));

    mockedList.mockResolvedValue([app('grant-1')]);
    await act(async () => result.current.revoke('grant-2'));

    await waitFor(() => expect(result.current.apps).toHaveLength(1));
    expect(result.current.apps?.[0].id).toBe('grant-1');
  });

  it('reports which connection is being revoked, and only that one', async () => {
    let finish: () => void = () => undefined;
    mockedRevoke.mockImplementation(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );

    const { result } = render();
    await waitFor(() => expect(result.current.apps).toHaveLength(2));

    act(() => result.current.revoke('grant-2'));
    await waitFor(() => expect(result.current.revokingId).toBe('grant-2'));

    await act(async () => finish());
    await waitFor(() => expect(result.current.revokingId).toBeNull());
  });

  it('surfaces a failed revoke and refetches so the row is not wrongly removed', async () => {
    mockedRevoke.mockRejectedValue(new Error('gone'));
    const { result } = render();
    await waitFor(() => expect(result.current.apps).toHaveLength(2));

    await act(async () => result.current.revoke('grant-2'));

    await waitFor(() => expect(result.current.revokeError).not.toBeNull());
    expect(result.current.apps).toHaveLength(2);
  });

  it('surfaces a failed load', async () => {
    mockedList.mockRejectedValue(new Error('oauth disabled'));

    const { result } = render();

    await waitFor(() => expect(result.current.loadError).not.toBeNull());
    expect(result.current.apps).toBeUndefined();
  });
});
