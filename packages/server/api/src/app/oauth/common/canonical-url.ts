// Scanned backwards rather than with a regex: `/\/+$/` backtracks quadratically, and
// one caller normalizes a client-supplied value on public endpoints.
export function stripTrailingSlashes(value: string): string {
  let end = value.length;

  while (end > 0 && value[end - 1] === '/') {
    end -= 1;
  }

  return end === value.length ? value : value.slice(0, end);
}
