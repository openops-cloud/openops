import { BenchmarkStatus } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';

import { benchmarkApi } from '../../benchmark/benchmark-api';
import { useBenchmarkBannerState } from './useBenchmarkBannerState';
import { useShowBenchmarkBanner } from './useShowBenchmarkBanner';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../benchmark/benchmark-api', () => ({
  benchmarkApi: {
    listBenchmarks: jest.fn(),
  },
}));

jest.mock('./useShowBenchmarkBanner', () => ({
  useShowBenchmarkBanner: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockUseShowBenchmarkBanner = useShowBenchmarkBanner as jest.Mock;
const mockListBenchmarks = benchmarkApi.listBenchmarks as jest.Mock;

const setupQueryMock = (data: unknown) => {
  mockUseQuery.mockImplementation(({ queryFn, enabled }) => {
    if (!enabled) return { data: undefined };
    queryFn();
    return { data };
  });
};

describe('useBenchmarkBannerState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListBenchmarks.mockResolvedValue([]);
  });

  it('returns isEnabled false and default variation when flag is disabled', () => {
    mockUseShowBenchmarkBanner.mockReturnValue(false);
    setupQueryMock(undefined);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.variation).toBe('default');
    expect(result.current.provider).toBe(undefined);
  });

  it('does not call listBenchmarks when flag is disabled', () => {
    mockUseShowBenchmarkBanner.mockReturnValue(false);
    mockUseQuery.mockImplementation(({ enabled }) => {
      if (!enabled) return { data: undefined };
      benchmarkApi.listBenchmarks();
      return { data: undefined };
    });

    renderHook(() => useBenchmarkBannerState());

    expect(mockListBenchmarks).not.toHaveBeenCalled();
  });

  it('calls listBenchmarks when flag is enabled', () => {
    mockUseShowBenchmarkBanner.mockReturnValue(true);
    setupQueryMock([]);

    renderHook(() => useBenchmarkBannerState());

    expect(mockListBenchmarks).toHaveBeenCalledTimes(1);
  });

  it('returns default variation when flag is enabled but no benchmarks exist', () => {
    mockUseShowBenchmarkBanner.mockReturnValue(true);
    setupQueryMock([]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.variation).toBe('default');
    expect(result.current.provider).toBe(undefined);
  });

  it('returns default variation when flag is enabled but benchmark is RUNNING', () => {
    mockUseShowBenchmarkBanner.mockReturnValue(true);
    setupQueryMock([
      { benchmarkId: 'bm-1', provider: 'aws', status: BenchmarkStatus.RUNNING },
    ]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.variation).toBe('default');
  });

  it('returns default variation when benchmark is CREATED', () => {
    mockUseShowBenchmarkBanner.mockReturnValue(true);
    setupQueryMock([
      { benchmarkId: 'bm-1', provider: 'aws', status: BenchmarkStatus.CREATED },
    ]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.variation).toBe('default');
  });

  it('returns default variation when benchmark has FAILED status', () => {
    mockUseShowBenchmarkBanner.mockReturnValue(true);
    setupQueryMock([
      { benchmarkId: 'bm-1', provider: 'aws', status: BenchmarkStatus.FAILED },
    ]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.variation).toBe('default');
  });

  it('returns report variation and aws provider when aws benchmark has SUCCEEDED', () => {
    mockUseShowBenchmarkBanner.mockReturnValue(true);
    setupQueryMock([
      {
        benchmarkId: 'bm-1',
        provider: 'aws',
        status: BenchmarkStatus.SUCCEEDED,
      },
    ]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.variation).toBe('report');
    expect(result.current.provider).toBe('aws');
  });

  it('returns report variation when there are multiple benchmarks and one has SUCCEEDED', () => {
    mockUseShowBenchmarkBanner.mockReturnValue(true);
    setupQueryMock([
      { benchmarkId: 'bm-1', provider: 'aws', status: BenchmarkStatus.RUNNING },
      {
        benchmarkId: 'bm-2',
        provider: 'azure',
        status: BenchmarkStatus.SUCCEEDED,
      },
    ]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.variation).toBe('report');
    expect(result.current.provider).toBe('azure');
  });
});
