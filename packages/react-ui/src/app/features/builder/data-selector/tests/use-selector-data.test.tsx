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

let setInitialLoad: jest.Mock;
let forceRerender: jest.Mock;

function setupHook(options = {}) {
  const defaultOptions = {
    stepIds: ['a'],
    flowVersionId: 'fv1',
    useNewExternalTestData: true,
    isDataSelectorVisible: true,
    initialLoad: true,
    setInitialLoad,
    forceRerender,
  };
  const merged = { ...defaultOptions, ...options };
  return renderHook(
    () =>
      useSelectorData({
        stepIds: merged.stepIds,
        flowVersionId: merged.flowVersionId,
        isDataSelectorVisible: merged.isDataSelectorVisible,
        initialLoad: merged.initialLoad,
        setInitialLoad: merged.setInitialLoad,
        forceRerender: merged.forceRerender,
      }),
    { wrapper: Wrapper },
  );
}

describe('useSelectorData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    stepTestOutputCache.clearAll();
    setInitialLoad = jest.fn();
    forceRerender = jest.fn();
  });

  it('fetches and caches data for all stepIds on initial load', async () => {
    const stepIds = ['a', 'b'];
    const flowVersionId = 'fv1';
    const testData = {
      a: { output: { foo: 1 }, lastTestDate: '2024-01-01T00:00:00Z' },
      b: { output: { bar: 2 }, lastTestDate: '2024-01-01T00:00:00Z' },
    };
    (flowsApi.getStepTestOutputBulk as jest.Mock).mockResolvedValue(testData);

    let initialLoad = true;
    setInitialLoad.mockImplementation((v) => {
      initialLoad = v;
    });

    const { result } = setupHook({ stepIds, flowVersionId, initialLoad });
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

  it('fetches only for stepIds not in cache on subsequent loads', async () => {
    const stepIds = ['a', 'b', 'c'];
    const flowVersionId = 'fv2';
    const testData = { c: { baz: 3 } };
    (flowsApi.getStepTestOutputBulk as jest.Mock).mockResolvedValue(testData);

    const stepAData = {
      output: { foo: 1 },
      lastTestDate: '2024-01-01T00:00:00Z',
    };
    const stepBData = {
      output: { bar: 2 },
      lastTestDate: '2024-01-01T00:00:00Z',
    };

    stepTestOutputCache.setStepData('a', stepAData);
    stepTestOutputCache.setStepData('b', stepBData);

    const initialLoad = false;
    const { result } = setupHook({ stepIds, flowVersionId, initialLoad });
    await waitFor(() => !result.current.isLoading);

    expect(flowsApi.getStepTestOutputBulk).toHaveBeenCalledWith(flowVersionId, [
      'c',
    ]);
    expect(stepTestOutputCache.getStepData('a')).toEqual(stepAData);
    expect(stepTestOutputCache.getStepData('b')).toEqual(stepBData);
    expect(stepTestOutputCache.getStepData('c')).toEqual(testData.c);
    expect(forceRerender).toHaveBeenCalledTimes(1);
  });

  it('does not fetch if stepIds is empty', async () => {
    const stepIds: string[] = [];
    const flowVersionId = 'fv4';
    (flowsApi.getStepTestOutputBulk as jest.Mock).mockClear();

    const initialLoad = true;
    const { result } = setupHook({ stepIds, flowVersionId, initialLoad });
    await waitFor(() => !result.current.isLoading);
    expect(flowsApi.getStepTestOutputBulk).not.toHaveBeenCalled();
    expect(forceRerender).not.toHaveBeenCalled();
  });

  it('calls forceRerender only once per fetch even for multiple stepIds', async () => {
    const stepIds = ['a', 'b', 'c'];
    const flowVersionId = 'fv5';
    const testData = { a: { foo: 1 }, b: { bar: 2 }, c: { baz: 3 } };
    (flowsApi.getStepTestOutputBulk as jest.Mock).mockResolvedValue(testData);

    const initialLoad = true;
    const { result } = setupHook({ stepIds, flowVersionId, initialLoad });
    await waitFor(() => !result.current.isLoading);
    expect(forceRerender).toHaveBeenCalledTimes(1);
  });

  it('handles fetch errors gracefully', async () => {
    const stepIds = ['a'];
    const flowVersionId = 'fv6';
    (flowsApi.getStepTestOutputBulk as jest.Mock).mockRejectedValue(
      new Error('Network error'),
    );

    const initialLoad = true;
    const { result } = setupHook({ stepIds, flowVersionId, initialLoad });
    await waitFor(() => !result.current.isLoading);
    expect(forceRerender).not.toHaveBeenCalled();
  });

  it('does not fetch if isDataSelectorVisible is false', async () => {
    const stepIds = ['a'];
    const flowVersionId = 'fv9';
    (flowsApi.getStepTestOutputBulk as jest.Mock).mockClear();

    const initialLoad = true;
    const { result } = setupHook({
      stepIds,
      flowVersionId,
      isDataSelectorVisible: false,
      initialLoad,
    });
    await waitFor(() => !result.current.isLoading);
    expect(flowsApi.getStepTestOutputBulk).not.toHaveBeenCalled();
    expect(forceRerender).not.toHaveBeenCalled();
  });
});
