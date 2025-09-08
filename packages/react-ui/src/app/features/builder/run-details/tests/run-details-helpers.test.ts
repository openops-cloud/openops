import { FlowRun, FlowRunStatus } from '@openops/shared';
import { getRunMessage, getStatusText } from '../run-details-helpers';

jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

describe('getRunMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('should return null', () => {
    it.each([
      ['run is null', null],
      ['run is undefined', undefined],
    ])('when %s', (_, run) => {
      // @ts-expect-error Testing null/undefined cases
      const result = getRunMessage(run, 30);
      expect(result).toBeNull();
    });

    it.each([
      ['RUNNING', FlowRunStatus.RUNNING],
      ['SCHEDULED', FlowRunStatus.SCHEDULED],
    ])('when run has %s status', (_, status) => {
      const run = { status } as FlowRun;
      const result = getRunMessage(run, 30);
      expect(result).toBeNull();
    });

    it.each([
      ['TIMEOUT', FlowRunStatus.TIMEOUT],
      ['SUCCEEDED', FlowRunStatus.SUCCEEDED],
      ['FAILED', FlowRunStatus.FAILED],
      ['STOPPED', FlowRunStatus.STOPPED],
      ['PAUSED', FlowRunStatus.PAUSED],
    ])('when run has %s status with logsFileId', (_, status) => {
      const run = { status, logsFileId: 'some-log-file-id' } as FlowRun;
      const result = getRunMessage(run, 30);
      expect(result).toBeNull();
    });
  });

  describe('should return "no logs captured" message', () => {
    it('when run has INTERNAL_ERROR status', () => {
      const run = { status: FlowRunStatus.INTERNAL_ERROR } as FlowRun;
      const result = getRunMessage(run, 30);
      expect(result).toBe('There are no logs captured for this run.');
    });
  });

  describe('should return retention message', () => {
    it.each([
      ['TIMEOUT status with null logsFileId', FlowRunStatus.TIMEOUT, null, 30],
      [
        'TIMEOUT status with undefined logsFileId',
        FlowRunStatus.TIMEOUT,
        undefined,
        30,
      ],
      [
        'SUCCEEDED status with null logsFileId',
        FlowRunStatus.SUCCEEDED,
        null,
        30,
      ],
      ['FAILED status with null logsFileId', FlowRunStatus.FAILED, null, 30],
      ['PAUSED status with null logsFileId', FlowRunStatus.PAUSED, null, 30],
      [
        'SUCCEEDED status with null retentionDays',
        FlowRunStatus.SUCCEEDED,
        null,
        null,
      ],
    ])('when run has %s', (_, status, logsFileId, retentionDays) => {
      const run = { status, logsFileId } as FlowRun;
      const result = getRunMessage(run, retentionDays);
      expect(result).toBe(
        'Logs are kept for {days} days after execution and then deleted.',
      );
    });
  });
});

describe('getStatusText', () => {
  test('should return success message', () => {
    const result = getStatusText(FlowRunStatus.SUCCEEDED, 60);
    expect(result).toBe('Run Succeeded');
  });

  describe('should return specific status messages', () => {
    it.each([
      ['STOPPED', FlowRunStatus.STOPPED, 'Workflow Run was stopped'],
      ['FAILED', FlowRunStatus.FAILED, 'Run Failed'],
      ['PAUSED', FlowRunStatus.PAUSED, 'Workflow Run is paused'],
      ['RUNNING', FlowRunStatus.RUNNING, 'Running'],
      [
        'INTERNAL_ERROR',
        FlowRunStatus.INTERNAL_ERROR,
        'Run failed for an unknown reason, contact support.',
      ],
    ])('when status is %s', (_, status, expectedMessage) => {
      const result = getStatusText(status, 60);
      expect(result).toBe(expectedMessage);
    });
  });

  describe('should return timeout message', () => {
    it.each([
      [30, 'Run exceeded {timeout} seconds, try to optimize your steps.'],
      [60, 'Run exceeded {timeout} seconds, try to optimize your steps.'],
      [120, 'Run exceeded {timeout} seconds, try to optimize your steps.'],
      [-1, 'Run exceeded {timeout} seconds, try to optimize your steps.'],
    ])('when timeout is %s seconds', (timeout, expectedMessage) => {
      const result = getStatusText(FlowRunStatus.TIMEOUT, timeout);
      expect(result).toBe(expectedMessage);
    });
  });

  describe('should handle unknown status', () => {
    it('when status is not recognized', () => {
      // @ts-expect-error Testing unknown status
      const result = getStatusText('UNKNOWN_STATUS', 60);
      expect(result).toBe('Unknown status');
    });
  });
});
