const createUmbrellaSessionMock = jest.fn();
const createCustomApiCallActionMock = jest.fn();

jest.mock('../src/lib/common/auth', () => ({
  createUmbrellaSession: createUmbrellaSessionMock,
}));

jest.mock('@openops/blocks-common', () => ({
  createCustomApiCallAction: createCustomApiCallActionMock,
}));

const auth = {
  authUrl: 'auth url',
  apiUrl: 'https://api.example/api',
  username: 'user',
  password: 'pass',
  userManagementVersion: '2.0',
};

describe('customAnodotApiAction', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let definition: any;

  beforeAll(async () => {
    createCustomApiCallActionMock.mockImplementation((params) => params);
    const module = await import('../src/lib/custom-anodot-api-action');
    definition = module.customAnodotApiAction;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should declare the action against the Umbrella auth with an account selector', () => {
    expect(definition.name).toBe('custom_anodot_api_action');
    expect(definition.additionalProps.selectedAccount).toMatchObject({
      type: 'DROPDOWN',
      required: true,
    });
  });

  test('should use the connection api url as base url', () => {
    expect(definition.baseUrl(auth)).toBe('https://api.example/api');
  });

  test('should inject 1.0 headers from account key and division id', async () => {
    createUmbrellaSessionMock.mockResolvedValue({
      version: '1.0',
      apiUrl: auth.apiUrl,
      tokens: { Authorization: 'bearer', apikey: 'user-key:-1' },
    });

    const headers = await definition.authMapping({
      auth,
      propsValue: {
        selectedAccount: {
          accountId: '932213950603',
          accountKey: 16376,
          divisionId: 0,
          accountName: 'direct account',
        },
      },
    });

    expect(createUmbrellaSessionMock).toHaveBeenCalledWith(auth);
    expect(headers['Authorization']).toBe('bearer');
    expect(headers['apikey']).toBe('user-key:16376:0');
  });

  test('should inject 2.0 headers with a blank cost center segment', async () => {
    createUmbrellaSessionMock.mockResolvedValue({
      version: '2.0',
      apiUrl: auth.apiUrl,
      tokens: { Authorization: 'bearer', apikey: 'user-key:-1' },
    });

    const headers = await definition.authMapping({
      auth,
      propsValue: {
        selectedAccount: {
          accountId: '225220305501',
          accountKey: '225220305501',
          accountName: 'BillingTransferTest',
        },
      },
    });

    expect(headers['apikey']).toBe('user-key:225220305501:');
  });
});
