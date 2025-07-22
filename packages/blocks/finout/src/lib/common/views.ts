import { HttpMethod } from '@openops/blocks-common';
import { FinOutAuth } from '../auth';
import { makeRequest } from './make-request';

export async function getViews(
  auth: FinOutAuth,
): Promise<{ id: string; name: string }[]> {
  const response = await makeRequest({
    endpoint: 'view',
    method: HttpMethod.GET,
    auth,
  });

  const views = response.data as any[];

  return views;
}

export async function getView(auth: FinOutAuth, viewId: string): Promise<View> {
  const response = await makeRequest({
    endpoint: 'cost/query-by-view',
    method: HttpMethod.POST,
    auth,
    body: {
      viewId,
    },
  });

  const viewData = response.data as ViewData[];
  const filteredData = viewData.filter((item) => item.name !== 'Total');

  return {
    id: viewId,
    data: filteredData,
  };
}

export interface View {
  id: string;
  data: ViewData[];
}

export interface ViewData {
  name: string;
  data: {
    time: number;
    cost: number;
  }[];
}
