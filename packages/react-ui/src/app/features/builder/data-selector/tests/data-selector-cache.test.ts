import { StepTestOutputCache } from '../data-selector-cache';

describe('StepTestOutputCache', () => {
  let cache: StepTestOutputCache;
  beforeEach(() => {
    cache = new StepTestOutputCache();
  });

  it('should set and get step data', () => {
    cache.setStepData('step1', { foo: 'bar' });
    expect(cache.getStepData('step1')).toEqual({ foo: 'bar' });
  });

  it('should clear step data and expanded state', () => {
    cache.setStepData('step1', { foo: 'bar' });
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
    cache.setStepData('step1', { foo: 'bar' });
    cache.setExpanded('node1', true);
    cache.clearAll();
    expect(cache.getStepData('step1')).toBeUndefined();
    expect(cache.getExpanded('node1')).toBe(false);
  });
});
