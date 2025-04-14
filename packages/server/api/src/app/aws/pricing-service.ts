import { Filter } from '@aws-sdk/client-pricing';
import { getPriceListFromAws, SupportedPricingRegion } from '@openops/common';
import { AppSystemProp, system } from '@openops/server-shared';
import { ApplicationError, ErrorCode } from '@openops/shared';
import LRUCache from 'lru-cache';

const cache = new LRUCache({ max: 500, ttl: 1000 * 60 * 60 * 24 });

export async function getPrice(
  serviceCode: string,
  filters: Filter[],
  region: SupportedPricingRegion,
): Promise<unknown> {
  const cacheKey = createCacheKey(serviceCode, filters);
  let priceList = cache.get(cacheKey);
  if (!priceList) {
    const credentials = getCredentials();
    priceList = await getPriceListFromAws(
      credentials,
      region,
      serviceCode,
      filters,
    );
    cache.set(cacheKey, priceList);
  }

  return priceList;
}

function getCredentials(): { accessKeyId: string; secretAccessKey: string } {
  return {
    accessKeyId: getCredentialValue(AppSystemProp.AWS_PRICING_ACCESS_KEY_ID),
    secretAccessKey: getCredentialValue(
      AppSystemProp.AWS_PRICING_SECRET_ACCESS_KEY,
    ),
  };
}

function createCacheKey(serviceCode: string, filters: Filter[]): string {
  let cacheKey = `${serviceCode}`;

  filters.map((filter) => {
    cacheKey += `-${filter.Value}`;
  });

  return cacheKey;
}

function getCredentialValue(prop: AppSystemProp): string {
  const value = system.getOrThrow(prop);

  if (!value) {
    throw new ApplicationError(
      {
        code: ErrorCode.SYSTEM_PROP_NOT_DEFINED,
        params: {
          prop,
        },
      },
      `System property OPS_${prop} is not defined in the .env file.`,
    );
  }

  return value;
}
