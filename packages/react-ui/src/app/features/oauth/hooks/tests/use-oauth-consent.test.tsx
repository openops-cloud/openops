import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { oauthApi, OAuthConsentRequest } from '../../lib/oauth-api';
import { useOAuthConsent } from '../use-oauth-consent';

jest.mock('../../lib/oauth-api', () => ({
  oauthApi: { getConsentRequest: jest.fn(), decide: jest.fn() },
}));

const mockedGetConsentRequest = oauthApi.getConsentRequest as jest.Mock;
const mockedDecide = oauthApi.decide as jest.Mock;

const REQUEST: OAuthConsentRequest = {
  requestId: 'req-1',
  clientName: 'Claude Code',
  scope: 'mcp',
  resourceId: 'mcp',
};

const assign = jest.fn();

// Deliberately left at react-query's defaults, which retry failed queries. The hook is
// responsible for opting out, so overriding it here would hide that.
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

const render = (requestId: string | null) =>
  renderHook(() => useOAuthConsent(requestId), { wrapper });

beforeAll(() => {
  Object.defineProperty(window, 'location', {
    value: { assign },
    writable: true,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetConsentRequest.mockResolvedValue(REQUEST);
  mockedDecide.mockResolvedValue({ redirectTo: 'https://client/cb?code=abc' });
});

describe('useOAuthConsent', () => {
  it('exposes the pending request once loaded', async () => {
    const { result } = render('req-1');

    await waitFor(() => expect(result.current.request).toEqual(REQUEST));
    expect(mockedGetConsentRequest).toHaveBeenCalledWith('req-1');
  });

  it('does not ask the server for a request that was never identified', async () => {
    const { result } = render(null);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedGetConsentRequest).not.toHaveBeenCalled();
  });

  it('sends the browser to the redirect the server returned when approving', async () => {
    const { result } = render('req-1');
    await waitFor(() => expect(result.current.request).toEqual(REQUEST));

    await act(async () => result.current.approve());

    expect(mockedDecide).toHaveBeenCalledWith('req-1', true);
    // A full navigation, because the destination belongs to the calling client.
    expect(assign).toHaveBeenCalledWith('https://client/cb?code=abc');
  });

  it('sends the browser to the error redirect when denying', async () => {
    mockedDecide.mockResolvedValue({
      redirectTo: 'https://client/cb?error=access_denied',
    });
    const { result } = render('req-1');
    await waitFor(() => expect(result.current.request).toEqual(REQUEST));

    await act(async () => result.current.deny());

    expect(mockedDecide).toHaveBeenCalledWith('req-1', false);
    expect(assign).toHaveBeenCalledWith(
      'https://client/cb?error=access_denied',
    );
  });

  it('surfaces a failed load without retrying it', async () => {
    mockedGetConsentRequest.mockRejectedValue(new Error('expired'));

    const { result } = render('req-1');

    await waitFor(() => expect(result.current.loadError).not.toBeNull());
    expect(result.current.request).toBeUndefined();
    // A pending request is single-use: re-reading it cannot succeed.
    expect(mockedGetConsentRequest).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failed decision and leaves the browser where it is', async () => {
    mockedDecide.mockRejectedValue(new Error('gone'));
    const { result } = render('req-1');
    await waitFor(() => expect(result.current.request).toEqual(REQUEST));

    await act(async () => result.current.approve());

    await waitFor(() => expect(result.current.decisionError).not.toBeNull());
    expect(assign).not.toHaveBeenCalled();
  });
});
