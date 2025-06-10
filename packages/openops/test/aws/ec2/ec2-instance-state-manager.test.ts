jest.mock('@aws-sdk/client-ec2');
import * as EC2 from '@aws-sdk/client-ec2';

const mockEc2 = {
  ...jest.requireActual('@aws-sdk/client-ec2'),
  describeInstanceStatus: jest.fn(),
  stopInstances: jest.fn(),
  startInstances: jest.fn(),
};

(EC2.EC2 as jest.MockedFunction<any>).mockImplementation(() => mockEc2);

const waitForMock = {
  waitForConditionWithTimeout: jest.fn().mockImplementation((func: any) => {
    return func();
  }),
};

jest.mock('../../../src/lib/condition-watcher', () => waitForMock);

import {
  getInstanceState,
  startInstance,
  stopInstance,
} from '../../../src/lib/aws/ec2/ec2-instance-state-manager';

describe('ec2-instance-state-manager', () => {
  const OLD_ENV = process.env;
  beforeAll(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV }; // Make a copy
    process.env['OPS_AWS_ENABLE_IMPLICIT_ROLE'] = 'true';
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  describe('stopInstance', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should stop instance', async () => {
      mockEc2.stopInstances.mockResolvedValue('mockResult');

      const result = await stopInstance(
        'some creds',
        'instance-id',
        'region',
        false,
        undefined,
      );

      expect(result).toBe('mockResult');
      expect(mockEc2.stopInstances).toHaveBeenCalledTimes(1);
      expect(mockEc2.stopInstances).toHaveBeenCalledWith({
        InstanceIds: ['instance-id'],
        DryRun: false,
      });
    });

    test.each([true, false])(
      'should run with dry run',
      async (dryRun: boolean) => {
        mockEc2.stopInstances.mockResolvedValue('mockResult');

        await stopInstance(
          'some creds',
          'instance-id',
          'region',
          dryRun,
          undefined,
        );

        expect(mockEc2.stopInstances).toHaveBeenCalledTimes(1);
        expect(mockEc2.stopInstances).toHaveBeenCalledWith({
          InstanceIds: ['instance-id'],
          DryRun: dryRun,
        });
      },
    );

    test('should catch and throw if something throws', async () => {
      mockEc2.stopInstances.mockRejectedValue(new Error('some error'));

      await expect(
        stopInstance('some creds', 'instance-id', 'region', false, undefined),
      ).rejects.toThrow('some error');

      expect(waitForMock.waitForConditionWithTimeout).not.toBeCalled();
    });

    test('should wait for instance state change if wait for is set', async () => {
      mockEc2.stopInstances.mockResolvedValue('mockResult');
      mockEc2.describeInstanceStatus.mockResolvedValue({
        InstanceStatuses: [
          { InstanceState: { Name: EC2.InstanceStateName.stopped } },
        ],
      });

      await stopInstance('some creds', 'instance-id', 'region', false, 10);

      expect(waitForMock.waitForConditionWithTimeout).toHaveBeenCalledTimes(1);
      expect(waitForMock.waitForConditionWithTimeout).toBeCalledWith(
        expect.any(Function),
        300,
        10,
        `Instance state change to ${EC2.InstanceStateName.stopped}`,
      );
    });
  });

  describe('startInstance', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should start instance', async () => {
      mockEc2.startInstances.mockResolvedValue('mockResult');

      const result = await startInstance(
        'some creds',
        'instance-id',
        'region',
        false,
        undefined,
      );

      expect(result).toBe('mockResult');
      expect(mockEc2.startInstances).toHaveBeenCalledTimes(1);
      expect(mockEc2.startInstances).toHaveBeenCalledWith({
        InstanceIds: ['instance-id'],
        DryRun: false,
      });
      expect(waitForMock.waitForConditionWithTimeout).not.toHaveBeenCalled();
    });

    test.each([true, false])(
      'should run with dry run',
      async (dryRun: boolean) => {
        mockEc2.startInstances.mockResolvedValue('mockResult');
        mockEc2.describeInstanceStatus.mockResolvedValue({
          InstanceStatuses: [
            { InstanceState: { Name: EC2.InstanceStateName.running } },
          ],
        });

        await startInstance(
          'some creds',
          'instance-id',
          'region',
          dryRun,
          undefined,
        );

        expect(mockEc2.startInstances).toHaveBeenCalledTimes(1);
        expect(mockEc2.startInstances).toHaveBeenCalledWith({
          InstanceIds: ['instance-id'],
          DryRun: dryRun,
        });
      },
    );

    test('should catch and throw if something throws', async () => {
      mockEc2.startInstances.mockRejectedValue(new Error('some error'));

      await expect(
        startInstance('some creds', 'instance-id', 'region', false, undefined),
      ).rejects.toThrow('some error');

      expect(waitForMock.waitForConditionWithTimeout).not.toBeCalled();
    });

    test('should wait for instance state change if wait for is set', async () => {
      mockEc2.startInstances.mockResolvedValue('mockResult');
      mockEc2.describeInstanceStatus.mockResolvedValue({
        InstanceStatuses: [
          { InstanceState: { Name: EC2.InstanceStateName.running } },
        ],
      });

      await startInstance('some creds', 'instance-id', 'region', false, 10);

      expect(waitForMock.waitForConditionWithTimeout).toHaveBeenCalledTimes(1);
      expect(waitForMock.waitForConditionWithTimeout).toBeCalledWith(
        expect.any(Function),
        300,
        10,
        `Instance state change to ${EC2.InstanceStateName.running}`,
      );
    });
  });

  describe('getInstanceState', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test.each([
      [EC2.InstanceStateName.running],
      [EC2.InstanceStateName.stopped],
    ])(
      'should get instance state',
      async (instanceState: EC2.InstanceStateName) => {
        mockEc2.describeInstanceStatus.mockResolvedValue({
          InstanceStatuses: [{ InstanceState: { Name: instanceState } }],
        });

        const result = await getInstanceState(mockEc2, 'instance-id', false);
        expect(mockEc2.describeInstanceStatus).toHaveBeenCalledTimes(1);
        expect(mockEc2.describeInstanceStatus).toHaveBeenCalledWith({
          InstanceIds: ['instance-id'],
          IncludeAllInstances: true,
          DryRun: false,
        });
        expect(result?.Name).toBe(instanceState);
      },
    );

    test.each([true, false])(
      'should run with dry run',
      async (dryRun: boolean) => {
        mockEc2.describeInstanceStatus.mockResolvedValue({
          InstanceStatuses: [
            { InstanceState: { Name: EC2.InstanceStateName.stopped } },
          ],
        });

        await getInstanceState(mockEc2, 'instance-id', dryRun);
        expect(mockEc2.describeInstanceStatus).toHaveBeenCalledTimes(1);
        expect(mockEc2.describeInstanceStatus).toHaveBeenCalledWith({
          InstanceIds: ['instance-id'],
          IncludeAllInstances: true,
          DryRun: dryRun,
        });
      },
    );

    test('should throw if something throws', async () => {
      mockEc2.describeInstanceStatus.mockRejectedValue(new Error('some error'));

      await expect(
        getInstanceState(mockEc2, 'instance-id', false),
      ).rejects.toThrow('some error');
    });
  });
});
