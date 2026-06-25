import { QueryClient } from '@tanstack/react-query';
import { QueryKeys } from '../../../../constants/query-keys';
import { formatUtils } from '../../../../lib/utils';
import {
  setStepOutputCache,
  StepTestOutputCache,
  stepTestOutputCache,
} from '../data-selector-cache';

jest.mock('@/app/lib/utils', () => ({
  formatUtils: {
    formatStepInputOrOutput: jest.fn((data) => data),
  },
}));

jest.mock('dayjs', () => {
  const mockDayjs = () => ({
    toISOString: () => '2024-01-01T00:00:00Z',
  });
  mockDayjs.extend = jest.fn();
  return mockDayjs;
});

describe('StepTestOutputCache', () => {
  let cache: StepTestOutputCache;
  beforeEach(() => {
    cache = new StepTestOutputCache();
  });

  it('should set and get step data', () => {
    cache.setStepData('step1', {
      output: { foo: 'bar' },
      lastTestDate: '2024-01-01T00:00:00Z',
      success: true,
    });
    expect(cache.getStepData('step1')).toEqual({
      output: { foo: 'bar' },
      lastTestDate: '2024-01-01T00:00:00Z',
      success: true,
    });
  });

  it('should clear step data and expanded state', () => {
    cache.setStepData('step1', {
      output: { foo: 'bar' },
      lastTestDate: '2024-01-01T00:00:00Z',
      success: true,
    });
    cache.setExpanded('step1', true);
    cache.clearStep('step1');
    expect(cache.getStepData('step1')).toBeUndefined();
    expect(cache.getExpanded('step1')).toBe(false);
  });

  it('should set and get expanded state for nodes', () => {
    cache.setExpanded('node1', true);
    expect(cache.getExpanded('node1')).toBe(true);
    cache.setExpanded('node1', false);
    expect(cache.getExpanded('node1')).toBe(false);
  });

  it('should reset expanded state for a step', () => {
    cache.setExpanded('step1', true);
    cache.setExpanded('step1.child', true);
    cache.setExpanded('step2', true);
    cache.resetExpandedForStep('step1');
    expect(cache.getExpanded('step1')).toBe(false);
    expect(cache.getExpanded('step1.child')).toBe(false);
    expect(cache.getExpanded('step2')).toBe(true);
  });

  it('should clear all cache and expanded state', () => {
    cache.setStepData('step1', {
      output: { foo: 'bar' },
      lastTestDate: '2024-01-01T00:00:00Z',
      success: true,
    });
    cache.setExpanded('node1', true);
    cache.clearAll();
    expect(cache.getStepData('step1')).toBeUndefined();
    expect(cache.getExpanded('node1')).toBe(false);
  });

  it('should notify subscriber when expanded state changes for a key', () => {
    const callback = jest.fn();
    cache.subscribe('node1', callback);
    cache.setExpanded('node1', true);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not notify subscriber for a different key', () => {
    const callback = jest.fn();
    cache.subscribe('node1', callback);
    cache.setExpanded('node2', true);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should stop notifying after unsubscribe', () => {
    const callback = jest.fn();
    const unsubscribe = cache.subscribe('node1', callback);
    unsubscribe();
    cache.setExpanded('node1', true);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should notify subscriber when clearStep removes an expanded child key', () => {
    const callback = jest.fn();
    cache.setExpanded("step1['foo']", true);
    cache.subscribe("step1['foo']", callback);
    cache.clearStep('step1');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should notify all subscribers on clearAll', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    cache.subscribe('node1', cb1);
    cache.subscribe('node2', cb2);
    cache.clearAll();
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('should clear expandedNodes before notifying on clearAll so getExpanded returns false during notification', () => {
    cache.setExpanded('node1', true);
    let valueSeenDuringNotification: boolean | undefined;
    cache.subscribe('node1', () => {
      valueSeenDuringNotification = cache.getExpanded('node1');
    });
    cache.clearAll();
    expect(valueSeenDuringNotification).toBe(false);
  });

  it('should clear child expanded nodes when clearing a step', () => {
    cache.setExpanded("step1['foo']", true);
    cache.setExpanded('step1[0]', true);
    cache.setExpanded('step2', true);
    cache.clearStep('step1');
    expect(cache.getExpanded("step1['foo']")).toBe(false);
    expect(cache.getExpanded('step1[0]')).toBe(false);
    expect(cache.getExpanded('step2')).toBe(true);
  });

  it('should clear expanded nodes by stepName when stepId and stepName differ', () => {
    const stepId = 'uuid-1234';
    const stepName = 'step_1';
    cache.setStepData(stepId, {
      output: { x: 1 },
      lastTestDate: '2024-01-01T00:00:00Z',
      success: true,
    });
    cache.setExpanded(stepName, true);
    cache.setExpanded(`${stepName}['child']`, true);
    cache.clearStep(stepId, stepName);
    expect(cache.getStepData(stepId)).toBeUndefined();
    expect(cache.getExpanded(stepName)).toBe(false);
    expect(cache.getExpanded(`${stepName}['child']`)).toBe(false);
  });

  it('should not notify subscriber when setting the same expanded value', () => {
    const callback = jest.fn();
    cache.setExpanded('node1', true);
    cache.subscribe('node1', callback);
    cache.setExpanded('node1', true);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should remove the subscriber set from the map after the last unsubscribe', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const unsub1 = cache.subscribe('node1', cb1);
    const unsub2 = cache.subscribe('node1', cb2);
    unsub1();
    unsub2();
    // subscribing again should work correctly after map cleanup
    const cb3 = jest.fn();
    cache.subscribe('node1', cb3);
    cache.setExpanded('node1', true);
    expect(cb3).toHaveBeenCalledTimes(1);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });
});

describe('setStepOutputCache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    queryClient.setQueryData = jest.fn();
    (formatUtils.formatStepInputOrOutput as jest.Mock).mockImplementation(
      (data) => data,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should set data in both cache and query client', async () => {
    const stepId = 'test-step-id';
    const flowVersionId = 'test-flow-version-id';
    const output = { result: 'success' };
    const input = { param: 'value' };

    queryClient.cancelQueries = jest.fn().mockResolvedValue(undefined);

    await setStepOutputCache({
      stepId,
      flowVersionId,
      output,
      input,
      queryClient,
      success: true,
    });

    expect(stepTestOutputCache.getStepData(stepId)).toEqual({
      output: output,
      lastTestDate: '2024-01-01T00:00:00Z',
      success: true,
    });

    expect(formatUtils.formatStepInputOrOutput).toHaveBeenCalledWith(output);
    expect(formatUtils.formatStepInputOrOutput).toHaveBeenCalledWith(input);

    expect(queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: [QueryKeys.stepTestOutput, flowVersionId, stepId],
    });

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      [QueryKeys.stepTestOutput, flowVersionId, stepId],
      {
        output: output,
        lastTestDate: '2024-01-01T00:00:00Z',
        success: true,
        input: input,
      },
    );
  });

  it('stores success=false correctly in both cache and query client', async () => {
    const stepId = 'failing-step';
    const flowVersionId = 'fv-fail';
    const output = { error: 'timed out' };
    const input = { param: 'value' };

    queryClient.cancelQueries = jest.fn().mockResolvedValue(undefined);

    await setStepOutputCache({
      stepId,
      flowVersionId,
      output,
      input,
      queryClient,
      success: false,
    });

    expect(stepTestOutputCache.getStepData(stepId)).toEqual({
      output,
      lastTestDate: '2024-01-01T00:00:00Z',
      success: false,
    });

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      [QueryKeys.stepTestOutput, flowVersionId, stepId],
      expect.objectContaining({ success: false }),
    );
  });
});
