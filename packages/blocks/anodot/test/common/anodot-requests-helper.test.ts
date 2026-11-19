import {
  buildAccountApiKey,
  buildUserAccountApiKey,
  createAnodotAuthHeaders,
} from '../../src/lib/common/anodot-requests-helpers';
import { UmbrellaSession } from '../../src/lib/common/auth';

describe('createAnodotAuthHeaders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create auth headers for the given token and api key', async () => {
    const result = createAnodotAuthHeaders('authToken', 'accountApiKey');

    expect(result['Authorization']).toEqual('authToken');
    expect(result['Content-Type']).toEqual('application/json');
    expect(result['apikey']).toEqual('accountApiKey');
  });
});

describe('buildUserAccountApiKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should build key based on account key and division id', async () => {
    const result = buildUserAccountApiKey('accountApiKey', '1', '2');

    expect(result).toEqual('accountApiKey:1:2');
  });

  test('should strip the -1 suffix returned by the login endpoints', () => {
    expect(buildUserAccountApiKey('user-key:-1', '16376', '0')).toEqual(
      'user-key:16376:0',
    );
    expect(buildUserAccountApiKey('user-key:-1:null', '16376', '0')).toEqual(
      'user-key:16376:0',
    );
  });

  test.each([
    ['0', 'user-key:16376:0'],
    [0, 'user-key:16376:0'],
    [7, 'user-key:16376:7'],
  ])(
    'should keep a division id of %p instead of treating it as empty',
    (divisionId, expected) => {
      expect(
        buildUserAccountApiKey('user-key:-1', '16376', divisionId),
      ).toEqual(expected);
    },
  );

  test.each([[undefined], [null]])(
    'should emit a blank third segment when the division id is %p',
    (divisionId) => {
      expect(
        buildUserAccountApiKey('user-key:-1', '225220305501', divisionId),
      ).toEqual('user-key:225220305501:');
    },
  );
});

describe('buildAccountApiKey', () => {
  const tokens = { Authorization: 'bearer', apikey: 'user-key:-1' };
  const session10: UmbrellaSession = { version: '1.0', apiUrl: 'api', tokens };
  const session20: UmbrellaSession = { version: '2.0', apiUrl: 'api', tokens };

  const legacySelection = {
    accountId: '932213950603',
    accountKey: 16376,
    divisionId: 0,
  };

  const um2Selection = {
    accountId: '225220305501',
    accountKey: '225220305501',
  };

  test('should build a 1.0 key from account key and division id', () => {
    expect(buildAccountApiKey(session10, legacySelection)).toEqual(
      'user-key:16376:0',
    );
  });

  test('should build a 2.0 key from the account id with a blank cost center segment', () => {
    expect(buildAccountApiKey(session20, um2Selection)).toEqual(
      'user-key:225220305501:',
    );
  });

  test('should ignore a stale 1.0 key and division when the session is 2.0', () => {
    expect(buildAccountApiKey(session20, legacySelection)).toEqual(
      'user-key:932213950603:',
    );
  });
});
