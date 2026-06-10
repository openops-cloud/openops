import { HttpError, HttpHeaders } from '@openops/blocks-common';

// HttpError derives retryAfterMs from the response headers it was constructed
// with. We build it from a minimal AxiosError-shaped object exposing only the
// fields the `response` getter reads (status + headers).
function httpErrorWith(status: number, headers: HttpHeaders): HttpError {
  return new HttpError({}, {
    response: { status, headers },
  } as unknown as ConstructorParameters<typeof HttpError>[1]);
}

const AZURE_RETRY_HEADER = 'x-ms-ratelimit-microsoft.consumption-retry-after';

describe('HttpError.retryAfterMs', () => {
  it('returns undefined for non-429 responses even if a Retry-After is present', () => {
    expect(
      httpErrorWith(500, { 'retry-after': '30' }).retryAfterMs,
    ).toBeUndefined();
  });

  it('falls back to the Azure header when no standard Retry-After is present', () => {
    expect(
      httpErrorWith(429, { [AZURE_RETRY_HEADER]: '30' }).retryAfterMs,
    ).toBe(30000);
  });

  it('uses the standard Retry-After header when it is the only one present', () => {
    expect(httpErrorWith(429, { 'retry-after': '10' }).retryAfterMs).toBe(
      10000,
    );
  });

  it('prefers the standard Retry-After over the Azure header when both are present', () => {
    expect(
      httpErrorWith(429, {
        'retry-after': '10',
        [AZURE_RETRY_HEADER]: '30',
      }).retryAfterMs,
    ).toBe(10000);
  });

  it('returns undefined for a 429 carrying neither header', () => {
    expect(httpErrorWith(429, {}).retryAfterMs).toBeUndefined();
  });
});
