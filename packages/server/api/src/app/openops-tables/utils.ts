/* eslint-disable @typescript-eslint/no-explicit-any */
import { makeOpenOpsTablesPatch, makeOpenOpsTablesPost } from '@openops/common';
import { logger } from '@openops/server-shared';

/**
 * Simple promise-based delay function.
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Configuration for the resilient request wrapper.
 */
type ResilientRequestConfig = {
  retries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  consistentDelayMs?: number;
};

/**
 * Wraps an API call function with retry logic specifically for Baserow lock conflicts.
 * @param apiCallFn The function making the actual API call (e.g., makeOpenOpsTablesPost).
 * @param config Configuration for retries and delays.
 * @returns A function that takes the same arguments as apiCallFn but adds resilience.
 */
function wrapWithResilience<
  Args extends any[],
  U,
  T extends (...args: Args) => Promise<U>,
>(
  apiCallFn: T,
  config: ResilientRequestConfig = {},
): (...funcArgs: Args) => Promise<U> {
  const {
    retries = 3,
    initialDelayMs = 500,
    backoffFactor = 1.5,
    consistentDelayMs = 100,
  } = config;

  return async (...args: Args): Promise<U> => {
    let attempts = 0;
    let currentDelay = initialDelayMs;

    while (attempts <= retries) {
      attempts++;
      try {
        const result: U = await apiCallFn(...args);

        if (consistentDelayMs > 0 && attempts === 1) {
          await delay(consistentDelayMs);
        }
        return result;
      } catch (error: any) {
        const isLockConflict =
          error.response?.status === 409 &&
          error.response?.data?.error ===
            'ERROR_FAILED_TO_LOCK_FIELD_DUE_TO_CONFLICT';

        if (isLockConflict && attempts <= retries) {
          logger.warn(
            `Baserow lock conflict detected (attempt ${attempts}/${
              retries + 1
            }). Retrying in ${currentDelay}ms...`,
            { url: error.config?.url, method: error.config?.method },
          );
          await delay(currentDelay);
          currentDelay *= backoffFactor;
        } else {
          logger.error(
            `API call failed (attempt ${attempts}/${
              retries + 1
            }). No more retries or not a lock conflict.`,
            { error: error.message },
          );
          throw error;
        }
      }
    }
    throw new Error(
      'Exhausted retries for API call due to persistent lock conflicts.',
    );
  };
}

export const resilientPatch = wrapWithResilience(makeOpenOpsTablesPatch);
export const resilientPost = wrapWithResilience(makeOpenOpsTablesPost);
