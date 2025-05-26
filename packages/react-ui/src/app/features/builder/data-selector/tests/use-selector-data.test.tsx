import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { flowsApi } from '../../../flows/lib/flows-api';
import { stepTestOutputCache } from '../data-selector-cache';
import { useSelectorData } from '../use-selector-data';

jest.mock('../../../flows/lib/flows-api', () => ({
  flowsApi: {
    getStepTestOutputBulk: jest.fn(),
  },
}));

const queryClient = new QueryClient();
const Wrapper = (props: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {props.children}
  </QueryClientProvider>
);

describe('useSelectorData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    stepTestOutputCache.clearAll();
  });

  it('fetches and caches data for all stepIds on initial load', async () => {
    const stepIds = ['a', 'b'];
    const flowVersionId = 'fv1';
    const testData = { a: { foo: 1 }, b: { bar: 2 } };
    (flowsApi.getStepTestOutputBulk as jest.Mock).mockResolvedValue(testData);

    let initialLoad = true;
    const setInitialLoad = jest.fn((v) => {
      initialLoad = v;
    });
    const forceRerender = jest.fn();

    const { result } = renderHook(
      () =>
        useSelectorData({
          stepIds,
          flowVersionId,
          useNewExternalTestData: true,
          isDataSelectorVisible: true,
          initialLoad,
          setInitialLoad,
          forceRerender,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => !result.current.isLoading);

    expect(flowsApi.getStepTestOutputBulk).toHaveBeenCalledWith(
      flowVersionId,
      stepIds,
    );
    expect(stepTestOutputCache.getStepData('a')).toEqual(testData.a);
    expect(stepTestOutputCache.getStepData('b')).toEqual(testData.b);
    expect(setInitialLoad).toHaveBeenCalledWith(false);
    expect(forceRerender).toHaveBeenCalledTimes(1);
  });

  it('only fetches for stepIds not in cache on subsequent loads', async () => {
    const stepIds = ['a', 'b', 'c'];
    const flowVersionId = 'fv2';
    const testData = { c: { baz: 3 } };
    (flowsApi.getStepTestOutputBulk as jest.Mock).mockResolvedValue(testData);

    // Pre-populate cache for a and b
    stepTestOutputCache.setStepData('a', { cached: true });
    stepTestOutputCache.setStepData('b', { cached: true });

    let initialLoad = false;
    const setInitialLoad = jest.fn();
    const forceRerender = jest.fn();

    const { result } = renderHook(
      () =>
        useSelectorData({
          stepIds,
          flowVersionId,
          useNewExternalTestData: true,
          isDataSelectorVisible: true,
          initialLoad,
          setInitialLoad,
          forceRerender,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => !result.current.isLoading);

    expect(flowsApi.getStepTestOutputBulk).toHaveBeenCalledWith(flowVersionId, [
      'c',
    ]);
    expect(stepTestOutputCache.getStepData('a')).toEqual({ cached: true });
    expect(stepTestOutputCache.getStepData('b')).toEqual({ cached: true });
    expect(stepTestOutputCache.getStepData('c')).toEqual(testData.c);
    expect(forceRerender).toHaveBeenCalledTimes(1);
  });

  it('does not fetch if useNewExternalTestData is false', async () => {
    const stepIds = ['a'];
    const flowVersionId = 'fv3';
    (flowsApi.getStepTestOutputBulk as jest.Mock).mockClear();

    let initialLoad = true;
    const setInitialLoad = jest.fn();
    const forceRerender = jest.fn();

    const { result } = renderHook(
      () =>
        useSelectorData({
          stepIds,
          flowVersionId,
          useNewExternalTestData: false,
          isDataSelectorVisible: true,
          initialLoad,
          setInitialLoad,
          forceRerender,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => !result.current.isLoading);
    expect(flowsApi.getStepTestOutputBulk).not.toHaveBeenCalled();
    expect(forceRerender).not.toHaveBeenCalled();
  });
});
