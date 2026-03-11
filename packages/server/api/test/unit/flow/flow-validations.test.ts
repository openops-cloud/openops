import {
  ErrorCode,
  Flow,
  FlowVersion,
  PopulatedFlow,
} from '@openops/shared';
import {
  assertFlowBelongsToProject,
  assertFlowVersionBelongsToProject,
} from '../../../src/app/flows/common/flow-validations';
import { flowService } from '../../../src/app/flows/flow/flow.service';

jest.mock('../../../src/app/flows/flow/flow.service', () => ({
  flowService: {
    getOne: jest.fn(),
  },
}));

describe('Flow Validations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assertFlowVersionBelongsToProject', () => {
    it('should succeed when flow version belongs to project', async () => {
      const flowVersion = {
        flowId: 'flow-1',
      } as FlowVersion;
      const projectId = 'project-1';

      (flowService.getOne as jest.Mock).mockResolvedValue({
        id: 'flow-1',
        projectId: 'project-1',
      });

      await expect(
        assertFlowVersionBelongsToProject(flowVersion, projectId),
      ).resolves.not.toThrow();

      expect(flowService.getOne).toHaveBeenCalledWith({
        id: 'flow-1',
        projectId: 'project-1',
      });
    });

    it('should throw ApplicationError when flow version does not belong to project', async () => {
      const flowVersion = {
        flowId: 'flow-1',
      } as FlowVersion;
      const projectId = 'project-1';

      (flowService.getOne as jest.Mock).mockResolvedValue(null);

      await expect(
        assertFlowVersionBelongsToProject(flowVersion, projectId),
      ).rejects.toThrow(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.AUTHORIZATION,
            params: {
              message:
                'The flow and version are not associated with the project',
            },
          }),
        }),
      );
    });
  });

  describe('assertFlowBelongsToProject', () => {
    it('should succeed when flow belongs to project', () => {
      const flow = {
        projectId: 'project-1',
      } as Flow;
      const projectId = 'project-1';

      expect(() => assertFlowBelongsToProject(flow, projectId)).not.toThrow();
    });

    it('should succeed when populated flow belongs to project', () => {
      const flow = {
        projectId: 'project-1',
      } as PopulatedFlow;
      const projectId = 'project-1';

      expect(() => assertFlowBelongsToProject(flow, projectId)).not.toThrow();
    });

    it('should throw ApplicationError when flow does not belong to project', () => {
      const flow = {
        projectId: 'project-2',
      } as Flow;
      const projectId = 'project-1';

      expect(() => assertFlowBelongsToProject(flow, projectId)).toThrow(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.AUTHORIZATION,
            params: {
              message: 'The flow is not associated with the project',
            },
          }),
        }),
      );
    });
  });
});
