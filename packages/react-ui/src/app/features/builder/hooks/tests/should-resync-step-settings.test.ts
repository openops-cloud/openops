import { FlowVersion } from '@openops/shared';
import { shouldResyncStepSettings } from '../should-resync-step-settings';

const version = (id: string, updated: string): FlowVersion =>
  ({ id, updated } as FlowVersion);

describe('shouldResyncStepSettings', () => {
  it('does not resync when the refetched version matches the current one', () => {
    const current = version('v1', '2026-06-30T08:10:52.485Z');
    const refetched = version('v1', '2026-06-30T08:10:52.485Z');

    expect(shouldResyncStepSettings(refetched, current)).toBe(false);
  });

  it('does not resync for a stale (older) refetched version', () => {
    // React-query emits the stale cached flow on focus before refetching.
    const current = version('v1', '2026-06-30T08:10:52.485Z');
    const refetched = version('v1', '2026-06-30T08:10:46.610Z');

    expect(shouldResyncStepSettings(refetched, current)).toBe(false);
  });

  it('resyncs when the refetched version is strictly newer (external change)', () => {
    const current = version('v1', '2026-06-30T08:10:52.485Z');
    const refetched = version('v1', '2026-06-30T08:11:00.000Z');

    expect(shouldResyncStepSettings(refetched, current)).toBe(true);
  });

  it('resyncs when an external change produced a newer version id', () => {
    const current = version('v1', '2026-06-30T08:10:52.485Z');
    const refetched = version('v2', '2026-06-30T08:11:00.000Z');

    expect(shouldResyncStepSettings(refetched, current)).toBe(true);
  });

  it('does not resync for an older version even when the id changed', () => {
    // Editing a LOCKED version mints a new draft id locally while the cache
    // still holds the older version; that stale version is emitted on focus.
    const current = version('v2', '2026-06-30T08:11:00.000Z');
    const refetched = version('v1', '2026-06-30T08:10:52.485Z');

    expect(shouldResyncStepSettings(refetched, current)).toBe(false);
  });

  it('does not resync when the id changed but timestamps are equal', () => {
    const current = version('v1', '2026-06-30T08:10:52.485Z');
    const refetched = version('v2', '2026-06-30T08:10:52.485Z');

    expect(shouldResyncStepSettings(refetched, current)).toBe(false);
  });

  it('does not resync when either version is missing', () => {
    const current = version('v1', '2026-06-30T08:10:52.485Z');

    expect(shouldResyncStepSettings(undefined, current)).toBe(false);
    expect(shouldResyncStepSettings(current, undefined)).toBe(false);
  });
});
