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
});
