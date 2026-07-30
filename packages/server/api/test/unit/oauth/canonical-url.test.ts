import { stripTrailingSlashes } from '../../../src/app/oauth/canonical-url';

describe('stripTrailingSlashes', () => {
  it.each([
    ['https://ops.example.com/', 'https://ops.example.com'],
    ['https://ops.example.com///', 'https://ops.example.com'],
    ['https://ops.example.com', 'https://ops.example.com'],
    ['https://ops.example.com/api/v1//', 'https://ops.example.com/api/v1'],
    ['/v1/', '/v1'],
    ['/', ''],
    ['///', ''],
    ['', ''],
  ])('normalizes %j to %j', (input, expected) => {
    expect(stripTrailingSlashes(input)).toBe(expected);
  });

  it('leaves slashes that are not at the end alone', () => {
    expect(stripTrailingSlashes('https://a.example//b//c')).toBe(
      'https://a.example//b//c',
    );
  });

  it('stays fast on a long run of slashes', () => {
    // The `/\/+$/` this replaced is quadratic here: ~145 ms at 20k slashes, ~8.8 s at
    // 160k. One caller normalizes the client-supplied `resource` on public endpoints, so
    // that was reachable from an unauthenticated request. The budget is ~30,000× the
    // measured time, which is loose enough for a shared CI runner and still nowhere near
    // the seconds the regex took.
    const pathological = '/'.repeat(200_000) + 'x';

    const started = Date.now();
    expect(stripTrailingSlashes(pathological)).toBe(pathological);

    expect(Date.now() - started).toBeLessThan(1000);
  });
});
