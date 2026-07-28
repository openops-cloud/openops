import { api } from '@/app/lib/api';
import { oauthApi } from '../oauth-api';

jest.mock('@/app/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

const mockedGet = api.get as jest.Mock;
const mockedPost = api.post as jest.Mock;

describe('oauthApi', () => {
  beforeEach(() => {
    mockedGet.mockReset().mockResolvedValue({});
    mockedPost.mockReset().mockResolvedValue({ redirectTo: 'https://client' });
  });

  it('reads a pending request by id', async () => {
    await oauthApi.getConsentRequest('req-1');

    expect(mockedGet).toHaveBeenCalledWith('/v1/oauth/requests/req-1');
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
