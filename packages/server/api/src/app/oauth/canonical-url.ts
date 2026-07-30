/**
 * Trailing-slash normalization, without a regular expression.
 *
 * The obvious `value.replace(/\/+$/, '')` is quadratic: for a long run of slashes that
 * is not at the end, the engine matches greedily from every start position and
 * backtracks each time. Measured at ~145 ms for 20k slashes and ~8.8 s for 160k.
 *
 * That matters because one caller normalizes the client-supplied `resource` parameter on
 * `/authorize` and `/token`, both public. A single request could hold the event loop for
 * seconds. Scanning backwards is linear and has no such worst case.
 */
export function stripTrailingSlashes(value: string): string {
  let end = value.length;

  while (end > 0 && value.charCodeAt(end - 1) === SLASH) {
    end -= 1;
  }

  return end === value.length ? value : value.slice(0, end);
}

const SLASH = '/'.charCodeAt(0);
