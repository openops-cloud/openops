import { logger } from '@openops/server-shared';
import { isAwsPermissionError } from './is-aws-permission-error';

export async function fetchArraysAcrossRegions<T>(
  regions: readonly string[],
  fetchPerRegion: (region: string) => Promise<T[]>,
): Promise<T[]> {
  if (regions.length === 0) {
    return [];
  }

  const settled = await Promise.allSettled(
    regions.map((region) => fetchPerRegion(region)),
  );

  const results: T[] = [];
  let unexpectedError: unknown;

  settled.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      results.push(...outcome.value);
      return;
    }

    const region = regions[index];
    if (isAwsPermissionError(outcome.reason)) {
      logger.debug('Skipping AWS region due to permission error', {
        region,
        error: outcome.reason,
      });
      return;
    }

    unexpectedError ??= outcome.reason;
  });

  if (unexpectedError) {
    throw unexpectedError;
  }

  return results;
}
