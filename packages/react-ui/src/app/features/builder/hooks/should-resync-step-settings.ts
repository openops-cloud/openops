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
 * external change: a different version id, or one strictly newer than the
 * builder's current version. Equal (our own autosaved edit) or older (stale
 * cache emit) versions are ignored.
 */
export const shouldResyncStepSettings = (
  refetchedVersion: FlowVersion | undefined,
  currentVersion: FlowVersion | undefined,
): boolean => {
  if (!refetchedVersion?.id || !currentVersion?.id) {
    return false;
  }

  if (refetchedVersion.id !== currentVersion.id) {
    return true;
  }

  return (
    !!refetchedVersion.updated &&
    !!currentVersion.updated &&
    new Date(refetchedVersion.updated).getTime() >
      new Date(currentVersion.updated).getTime()
  );
};
