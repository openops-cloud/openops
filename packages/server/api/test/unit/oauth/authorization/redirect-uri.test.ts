import {
  isRegistrableRedirectUri,
  matchesRegisteredRedirectUri,
} from '../../../../src/app/oauth/authorization/redirect-uri';

describe('isRegistrableRedirectUri', () => {
  it.each([
    ['https callback', 'https://claude.ai/api/mcp/auth_callback', true],
    ['ipv4 loopback with port', 'http://127.0.0.1:33418/callback', true],
    ['localhost without port', 'http://localhost/cb', true],
    ['ipv6 loopback', 'http://[::1]:8000/cb', true],
    ['plain http host', 'http://evil.example.com/cb', false],
    ['https with fragment', 'https://ok.example.com/cb#frag', false],
    ['not a url', 'not-a-url', false],
    ['empty string', '', false],
    ['custom scheme', 'myapp://callback', false],
    ['userinfo', 'https://user:pass@a.example/cb', false],
    ['username only', 'https://user@a.example/cb', false],
    ['over length limit', `https://a.example/${'x'.repeat(600)}`, false],
  ])('%s -> %s', (_label, uri, expected) => {
    expect(isRegistrableRedirectUri(uri)).toBe(expected);
  });
});

describe('matchesRegisteredRedirectUri', () => {
  it('matches an identical https uri', () => {
    expect(
      matchesRegisteredRedirectUri(
        ['https://a.example/cb'],
        'https://a.example/cb',
      ),
    ).toBe(true);
  });

  it.each([
    ['different path', 'https://a.example/cb2'],
    ['different case', 'https://a.example/CB'],
    ['added query', 'https://a.example/cb?x=1'],
    ['different host', 'https://b.example/cb'],
  ])('rejects https uri with %s', (_label, presented) => {
    expect(
      matchesRegisteredRedirectUri(['https://a.example/cb'], presented),
    ).toBe(false);
  });

  it('matches loopback on a different port with the same host and path', () => {
    expect(
      matchesRegisteredRedirectUri(
        ['http://127.0.0.1:1234/cb'],
        'http://127.0.0.1:9999/cb',
      ),
    ).toBe(true);
  });

  it('rejects loopback with a different path even on the registered port', () => {
    expect(
      matchesRegisteredRedirectUri(
        ['http://127.0.0.1:1234/cb'],
        'http://127.0.0.1:1234/other',
      ),
    ).toBe(false);
  });

  it('does not let a loopback registration match a remote host', () => {
    expect(
      matchesRegisteredRedirectUri(
        ['http://127.0.0.1:1234/cb'],
        'http://attacker.example/cb',
      ),
    ).toBe(false);
  });

  it.each([
    ['userinfo smuggled in', 'http://user:pass@127.0.0.1:9999/cb'],
    ['a fragment appended', 'http://127.0.0.1:9999/cb#tail'],
    ['an over-length value', `http://127.0.0.1:9999/cb#${'A'.repeat(600)}`],
    ['a giant userinfo', `http://${'u'.repeat(700)}@127.0.0.1:9999/cb`],
  ])('rejects a loopback uri with %s', (_label, presented) => {
    // Loopback matching ignores the port, so these must be caught by the shape
    // rules rather than by the comparison.
    expect(
      matchesRegisteredRedirectUri(['http://127.0.0.1:1234/cb'], presented),
    ).toBe(false);
  });

  it('checks every registered uri', () => {
    expect(
      matchesRegisteredRedirectUri(
        ['https://a.example/cb', 'https://b.example/cb'],
        'https://b.example/cb',
      ),
    ).toBe(true);
  });

  it('rejects when nothing is registered', () => {
    expect(matchesRegisteredRedirectUri([], 'https://a.example/cb')).toBe(
      false,
    );
  });
});
