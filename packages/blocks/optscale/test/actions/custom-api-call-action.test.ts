import {
  customApiCallAction,
  customApiCallAuthMapping,
} from '../../src/lib/actions/custom-api-call-action';
import { signIn } from '../../src/lib/common/make-request';
import { auth } from './test-helpers';

jest.mock('../../src/lib/common/make-request', () => ({
  ...jest.requireActual('../../src/lib/common/make-request'),
  signIn: jest.fn(),
}));

describe('customApiCallAction', () => {
  test('defaults the URL to the OptScale REST API', async () => {
    const urlProps = await (customApiCallAction.props['url'] as any).props(
      { auth: { ...auth, baseUrl: 'https://optscale.example.com/' } },
      {},
    );

    expect(urlProps.url.defaultValue).toBe(
      'https://optscale.example.com/restapi/v2',
    );
  });

  test('signs in and sends a bearer token', async () => {
    (signIn as jest.Mock).mockResolvedValue('token-1');

    await expect(customApiCallAuthMapping({ auth })).resolves.toEqual({
      Authorization: 'Bearer token-1',
      'Content-Type': 'application/json',
    });
    expect(signIn).toHaveBeenCalledWith(auth);
  });

  test('is a write action', () => {
    expect(customApiCallAction).toMatchObject({
      name: 'optscale_custom_api_call',
      isWriteAction: true,
      requireAuth: true,
    });
  });
});
