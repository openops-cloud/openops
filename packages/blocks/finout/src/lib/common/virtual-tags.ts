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
  return await makeRequest({
    endpoint: `virtual-tags/${tagId}`,
    method: HttpMethod.GET,
    auth,
  });
}

export async function updateTag(
  auth: FinOutAuth,
  tagId: string,
  tag: VirtualTag,
): Promise<VirtualTag> {
  return await makeRequest({
    endpoint: `virtual-tags/${tagId}`,
    method: HttpMethod.PUT,
    auth,
    body: tag,
  });
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
