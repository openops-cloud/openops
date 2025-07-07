import { cacheWrapper, networkUtls } from '@openops/server-shared';
import { FlagId } from '@openops/shared';

const cacheKey = 'FeatureFlags';

async function getFeatureFlagsFromApi(
  engineToken: string,
): Promise<Record<string, unknown>> {
  const url = `${networkUtls.getInternalApiUrl()}v1/flags`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${engineToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get feature flags from the API.');
  }

  return response.json();
}

export async function getFeatureFlag<T>(
  engineToken: string,
  flagId: FlagId,
): Promise<T> {
  let featureFlags = await cacheWrapper.getSerializedObject<
    Record<string, unknown>
  >(cacheKey);

  if (featureFlags) {
    return featureFlags[flagId] as T;
  }

  featureFlags = await getFeatureFlagsFromApi(engineToken);
  await cacheWrapper.setSerializedObject(cacheKey, featureFlags);

  return featureFlags[flagId] as T;
}
