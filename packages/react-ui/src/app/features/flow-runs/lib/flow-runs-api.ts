import { AxiosRequestConfig } from 'axios';

import { api } from '@/app/lib/api';
import {
  FlowRun,
  ListFlowRunsRequestQuery,
  RetryFlowRequestBody,
  SeekPage,
} from '@openops/shared';

export const flowRunsApi = {
  list(request: ListFlowRunsRequestQuery): Promise<SeekPage<FlowRun>> {
    return api.get<SeekPage<FlowRun>>('/v1/flow-runs', request);
  },
  getPopulated(id: string, config?: AxiosRequestConfig): Promise<FlowRun> {
    return api.get<FlowRun>(`/v1/flow-runs/${id}`, undefined, config);
  },
  retry(flowRunId: string, request: RetryFlowRequestBody): Promise<FlowRun> {
    return api.post<FlowRun>(`/v1/flow-runs/${flowRunId}/retry`, request);
  },
  abort(flowRunId: string): Promise<void> {
    return api.post<void>(`/v1/flow-runs/${flowRunId}/stop`);
  },
};
