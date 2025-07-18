import { HttpMethod } from '@openops/blocks-common';
import { FinOutAuth } from '../auth';
import { makeRequest } from './make-request';

export async function getVirtualTags(auth: FinOutAuth): Promise<VirtualTag[]> {
  const response = await makeRequest({
    endpoint: 'virtual-tags',
    method: HttpMethod.GET,
    auth,
  });

  return response.virtualTags;
}

export async function getVirtualTagById(
  auth: FinOutAuth,
  tagId: string,
): Promise<VirtualTag> {
  const response = await makeRequest({
    endpoint: `virtual-tags/${tagId}`,
    method: HttpMethod.GET,
    auth,
  });

  return response;
}

export async function updateTag(
  auth: FinOutAuth,
  tagId: string,
  tag: VirtualTag,
): Promise<VirtualTag> {
  const response = await makeRequest({
    endpoint: `virtual-tags/${tagId}`,
    method: HttpMethod.PUT,
    auth,
    body: tag,
  });

  return response;
}

export interface VirtualTag {
  id: string;
  accountId: string;
  name: string;
  defaultValue: string;
  rules: VirtualTagRule[];
}

export interface VirtualTagRule {
  to: string;
  filters: {
    costCenter: string;
    key: string;
    displayName: string;
    operator: string;
    value: string[];
  };
}

interface VirtualTagWithValues extends VirtualTag {
  tagKey: string;
  values: string[];
}
