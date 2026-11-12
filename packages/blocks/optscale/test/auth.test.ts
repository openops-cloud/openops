import { optscaleAuth } from '../src/lib/auth';
import { sendOptScaleRequest, signIn } from '../src/lib/common/make-request';

jest.mock('../src/lib/common/make-request', () => ({
  signIn: jest.fn(),
  sendOptScaleRequest: jest.fn(),
}));

const auth = {
  baseUrl: 'https://optscale.example.com',
  email: 'user@example.com',
  password: 'secret',
};

describe('optscaleAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('declares the connection properties', () => {
    expect(optscaleAuth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'OptScale',
      authProviderDisplayName: 'OptScale',
      authProviderLogoUrl: '/blocks/optscale.svg',
      props: {
        baseUrl: {
          type: 'SHORT_TEXT',
          required: true,
          defaultValue: 'https://my.optscale.com',
        },
        email: { type: 'SHORT_TEXT', required: true },
        password: { type: 'SECRET_TEXT', required: true },
      },
    });
  });

  test('is valid when sign-in and the REST API call succeed', async () => {
    (signIn as jest.Mock).mockResolvedValue('token');
    (sendOptScaleRequest as jest.Mock).mockResolvedValue({});

    await expect(optscaleAuth.validate!({ auth } as any)).resolves.toEqual({
      valid: true,
    });
    expect(sendOptScaleRequest).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/organizations', query: { limit: 1 } }),
    );
  });

  test('is invalid when sign-in fails', async () => {
    (signIn as jest.Mock).mockRejectedValue(
      new Error('OptScale API error 403 OA0037: Email or password is invalid'),
    );

    const result = await optscaleAuth.validate!({ auth } as any);

    expect(result).toEqual({
      valid: false,
      error:
        'Could not sign in to OptScale: OptScale API error 403 OA0037: Email or password is invalid',
    });
    expect(sendOptScaleRequest).not.toHaveBeenCalled();
  });

  test('is invalid when the REST API cannot be reached', async () => {
    (signIn as jest.Mock).mockResolvedValue('token');
    (sendOptScaleRequest as jest.Mock).mockRejectedValue(new Error('denied'));

    await expect(optscaleAuth.validate!({ auth } as any)).resolves.toEqual({
      valid: false,
      error: 'Signed in to OptScale but could not reach the REST API: denied',
    });
  });
});
