// Scanned backwards rather than with a regex: `/\/+$/` backtracks quadratically, and
// one caller normalizes a client-supplied value on public endpoints.
export function stripTrailingSlashes(value: string): string {
  let end = value.length;

  while (end > 0 && value.charCodeAt(end - 1) === SLASH) {
    end -= 1;
  }

  return end === value.length ? value : value.slice(0, end);
}

const SLASH = '/'.charCodeAt(0);
