import {
  AttributeValue,
  DescribeServicesCommand,
  DescribeServicesCommandOutput,
  Filter,
  GetAttributeValuesCommand,
  GetAttributeValuesCommandOutput,
  GetProductsCommandInput,
  Pricing,
  Service,
} from '@aws-sdk/client-pricing';
import { cacheWrapper } from '@openops/server-shared';
import { makeAwsRequest } from './aws-client-wrapper';
import { getAwsClient } from './get-client';

// https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/using-price-list-query-api.html#price-list-query-api-endpoints
export type SupportedPricingRegion =
  | 'us-east-1'
  | 'eu-central-1'
  | 'ap-south-1';

export async function getServices(
  credentials: any,
  region: SupportedPricingRegion,
) {
  const responses = await makeRequest(
    credentials,
    region,
    new DescribeServicesCommand({}),
  );
  const services: Service[] = responses
    .map(
      (response) =>
        (response as unknown as DescribeServicesCommandOutput).Services || [],
    )
    .flat();

  return services;
}

export async function getAttributeValues(
  credentials: any,
  region: SupportedPricingRegion,
  serviceCode: string,
  attributeName: string,
) {
  const responses = await makeRequest(
    credentials,
    region,
    new GetAttributeValuesCommand({
      ServiceCode: serviceCode,
      AttributeName: attributeName,
    }),
  );
  const attributeValues: AttributeValue[] = responses
    .map(
      (response) =>
        (response as unknown as GetAttributeValuesCommandOutput)
          .AttributeValues || [],
    )
    .flat();

  return attributeValues;
}

export async function getPriceListFromAws(
  credentials: any,
  region: SupportedPricingRegion,
  serviceCode: string,
  filters: Filter[],
): Promise<any[]> {
  const params: GetProductsCommandInput = {
    ServiceCode: serviceCode,
    Filters: filters,
  };

  const client = getAwsClient(Pricing, credentials, region);
  const pricingProducts = await client.getProducts(params);

  if (!pricingProducts.PriceList || pricingProducts.PriceList.length === 0) {
    return [];
  }

  const priceList = pricingProducts.PriceList.map((item) =>
    JSON.parse(item as string),
  );

  for (const item of priceList) {
    const {
      terms: { OnDemand },
    } = item;
    const [{ priceDimensions }] = Object.values(OnDemand) as never[];
    const [{ pricePerUnit }] = Object.values(priceDimensions) as never[];
    item.pricePerUnit = pricePerUnit;
  }

  return priceList;
}

async function makeRequest(
  credentials: any,
  region: SupportedPricingRegion,
  command: any,
) {
  const pricingClient = getAwsClient(Pricing, credentials, region);
  const response: unknown[] = await makeAwsRequest(pricingClient, command);

  return response;
}

export async function getPriceListWithCache(
  credentials: any,
  serviceCode: string,
  filters: Filter[],
  region: SupportedPricingRegion,
): Promise<unknown> {
  const cacheKey = createCacheKey(serviceCode, filters);

  return await cacheWrapper.getOrAdd(cacheKey, getPriceListFromAws, [
    credentials,
    region,
    serviceCode,
    filters,
  ]);
}

function createCacheKey(serviceCode: string, filters: Filter[]): string {
  let cacheKey = `${serviceCode}`;

  filters.forEach((filter) => {
    cacheKey += `-${filter.Value}`;
  });

  return cacheKey;
}
