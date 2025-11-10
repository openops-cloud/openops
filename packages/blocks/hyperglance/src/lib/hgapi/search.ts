import { Property } from '@openops/blocks-framework';
import { HGAuth } from '../auth';
import { makeGetRequest } from '../callRestApi';
export function getAccountProp() {
  return Property.ShortText({
    displayName: 'Filter by Account name',
    required: false,
  });
}

export function getTagKeyProp() {
  return Property.ShortText({
    displayName: 'Filter by Tag Key',
    required: false,
  });
}

export function getTagValueProp() {
  return Property.ShortText({
    displayName: 'Filter by Tag Value',
    required: false,
  });
}

export type SearchPropsType = {
  datasource?: string;
  type?: string;
  account?: string;
  tagKey?: string;
  tagValue?: string;
};

export async function search(auth: HGAuth, data: SearchPropsType) {
  const queryParams: Record<string, string> = {};
  if (data.datasource) {
    queryParams['datasource'] = data.datasource;
  }
  if (data.type) {
    queryParams['type'] = data.type;
  }
  if (data.account) {
    queryParams['account'] = data.account;
  }
  if (data.tagKey) {
    queryParams['tag_key'] = data.tagKey;
  }
  if (data.tagValue) {
    queryParams['tag_value'] = data.tagValue;
  }

  const url = auth.instanceUrl + '/hgapi/inventory';
  return await makeGetRequest(url, auth.authToken, queryParams);
}
