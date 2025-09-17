/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContentType } from '@openops/shared';

jest.mock('../../flow/flow.service', () => ({
  flowService: {
    filterVisibleFlows: jest.fn().mockResolvedValue({
      flowFilterCondition: 'flows."isInternal" = :isInternal',
      flowFilterParams: { isInternal: false },
    }),
  },
}));

jest.mock(
  '../../../../enterprise-api/lib/private-template/private-template.service',
  () => ({
    privateTemplateService: {
      getTemplateFlowsFilter: jest.fn().mockResolvedValue({
        filterCondition: 'some template condition',
        flowFilterParams: { projectId: 'p1' },
      }),
    },
  }),
);

import { flowService } from '../../flow/flow.service';
import { getFlowFilter } from '../flow-filter-util';

describe('getFlowFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses flowService.filterVisibleFlows for WORKFLOW', async () => {
    const result = await getFlowFilter(ContentType.WORKFLOW);

    expect(flowService.filterVisibleFlows).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      condition: 'flows."isInternal" = :isInternal',
      params: { isInternal: false },
    });
  });
});
