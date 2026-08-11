import { FindOperator, LessThan } from 'typeorm';

/**
 * Timestamp columns are typed as `string` but must be compared as a `Date`: drivers
 * serialise dates in their own textual format, so an ISO-string predicate is a textual
 * comparison that can match every row. The cast is confined here.
 */
export function earlierThan(instant: Date): FindOperator<string> {
  return LessThan(instant) as unknown as FindOperator<string>;
}
