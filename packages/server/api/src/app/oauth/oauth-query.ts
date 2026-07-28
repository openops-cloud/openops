import { FindOperator, LessThan } from 'typeorm';

/**
 * A "column is earlier than this instant" predicate.
 *
 * The timestamp columns are typed as `string` on the models because that is what
 * application code reads and writes, but a comparison must be bound as a `Date`:
 * drivers serialise dates in their own textual format, and comparing that against
 * an ISO string is a *textual* comparison. SQLite, for instance, stores
 * `2026-07-28 13:43:09.011` — every such value sorts below any `…T…Z` string, so
 * an ISO-string predicate matches every row including future ones.
 *
 * The cast is confined here so the call sites stay readable.
 */
export function earlierThan(instant: Date): FindOperator<string> {
  return LessThan(instant) as unknown as FindOperator<string>;
}
