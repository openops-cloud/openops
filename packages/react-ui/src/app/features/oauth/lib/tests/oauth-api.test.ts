import { api } from '@/app/lib/api';
import { oauthApi } from '../oauth-api';

jest.mock('@/app/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const mockedGet = api.get as jest.Mock;
const mockedPost = api.post as jest.Mock;
const mockedDelete = api.delete as jest.Mock;

describe('oauthApi', () => {
  beforeEach(() => {
    mockedGet.mockReset().mockResolvedValue({});
    mockedPost.mockReset().mockResolvedValue({ redirectTo: 'https://client' });
    mockedDelete.mockReset().mockResolvedValue(undefined);
  });

  it('reads a pending request by id', async () => {
    await oauthApi.getConsentRequest('req-1');

    expect(mockedGet).toHaveBeenCalledWith('/v1/oauth/requests/req-1');
  });

  it('encodes the request id, which comes from the query string', async () => {
    await oauthApi.getConsentRequest('../grants');
    await oauthApi.decide('../grants', true);

    expect(mockedGet).toHaveBeenCalledWith('/v1/oauth/requests/..%2Fgrants');
    expect(mockedPost).toHaveBeenCalledWith(
      '/v1/oauth/requests/..%2Fgrants/decision',
      { approve: true },
      undefined,
      { 'x-openops-consent': '1' },
    );
  });

  it('sends the consent header with the decision', async () => {
    await oauthApi.decide('req-1', true);

    // The server refuses a decision without this header, which is what stops a
    // cross-site form post from answering on a signed-in user's behalf.
    expect(mockedPost).toHaveBeenCalledWith(
      '/v1/oauth/requests/req-1/decision',
      { approve: true },
      undefined,
      { 'x-openops-consent': '1' },
    );
  });

  it('unwraps the connected apps list', async () => {
    mockedGet.mockResolvedValue({ data: [{ id: 'grant-1' }] });

    await expect(oauthApi.listConnectedApps()).resolves.toEqual([
      { id: 'grant-1' },
    ]);
    expect(mockedGet).toHaveBeenCalledWith('/v1/oauth/grants');
  });

  it('revokes one connection by its own id', async () => {
    await oauthApi.revokeConnectedApp('grant-2');

    expect(mockedDelete).toHaveBeenCalledWith('/v1/oauth/grants/grant-2');
  });

  it('carries a denial through as approve false', async () => {
    await oauthApi.decide('req-1', false);

    expect(mockedPost).toHaveBeenCalledWith(
      '/v1/oauth/requests/req-1/decision',
      { approve: false },
      undefined,
      expect.anything(),
    );
  });
});
