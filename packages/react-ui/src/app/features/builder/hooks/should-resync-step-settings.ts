import { FlowVersion } from '@openops/shared';

/**
 * Decide whether the step settings form should be re-synced after the flow
 * query emits, given the refetched version and the version the builder already
 * has.
 *
 * The flow query refetches on every window focus (refetchOnWindowFocus:
 * 'always') and react-query emits the stale cached flow before the fresh result.
 * Re-syncing resets the settings form and remounts dynamic array properties
 * (re-firing their `/options` requests), so we only do it for a genuinely
 * external change: a version strictly newer than the builder's current one.
 *
 * A newer `updated` timestamp is the reliable signal — a version id difference
 * alone is not, because the builder can mint a new draft id locally (e.g. when
 * editing a LOCKED version) while the cache still holds the older version. On
 * the next focus that older version is emitted first, and gating on the id
 * difference would wrongly resync against stale data. Equal (our own autosaved
 * edit) or older (stale cache emit) versions are ignored.
 */
export const shouldResyncStepSettings = (
  refetchedVersion: FlowVersion | undefined,
  currentVersion: FlowVersion | undefined,
): boolean => {
  if (!refetchedVersion?.id || !currentVersion?.id) {
    return false;
  }

  return (
    !!refetchedVersion.updated &&
    !!currentVersion.updated &&
    new Date(refetchedVersion.updated).getTime() >
      new Date(currentVersion.updated).getTime()
  );
};
