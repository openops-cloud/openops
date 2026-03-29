import { SimplifiedRunStatus } from '@openops/shared';
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

  it('returns isEnabled false and default variation when banner should not be shown', () => {
    mockUseShowBenchmarkBanner.mockReturnValue({
      showBanner: false,
      isPending: false,
    });
    setupQueryMock(undefined);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.variation).toBe('default');
    expect(result.current.providers).toEqual([]);
  });

  it('does not call listBenchmarks when banner should not be shown', () => {
    mockUseShowBenchmarkBanner.mockReturnValue({
      showBanner: false,
      isPending: false,
    });
    mockUseQuery.mockImplementation(({ enabled }) => {
      if (!enabled) return { data: undefined };
      benchmarkApi.listBenchmarks();
      return { data: undefined };
    });

    renderHook(() => useBenchmarkBannerState());

    expect(mockListBenchmarks).not.toHaveBeenCalled();
  });

  it('calls listBenchmarks when banner should be shown', () => {
    mockUseShowBenchmarkBanner.mockReturnValue({
      showBanner: true,
      isPending: false,
    });
    setupQueryMock([]);

    renderHook(() => useBenchmarkBannerState());

    expect(mockListBenchmarks).toHaveBeenCalledTimes(1);
  });

  it('returns default variation when banner is shown but no benchmarks exist', () => {
    mockUseShowBenchmarkBanner.mockReturnValue({
      showBanner: true,
      isPending: false,
    });
    setupQueryMock([]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.variation).toBe('default');
    expect(result.current.providers).toEqual([]);
  });

  it('returns default variation when banner is shown but benchmark is RUNNING', () => {
    mockUseShowBenchmarkBanner.mockReturnValue({
      showBanner: true,
      isPending: false,
    });
    setupQueryMock([
      { benchmarkId: 'bm-1', provider: 'aws', status: SimplifiedRunStatus.RUNNING },
    ]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.variation).toBe('default');
  });

  it('returns default variation when benchmark is CREATED', () => {
    mockUseShowBenchmarkBanner.mockReturnValue({
      showBanner: true,
      isPending: false,
    });
    setupQueryMock([
      { benchmarkId: 'bm-1', provider: 'aws', status: SimplifiedRunStatus.CREATED },
    ]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.variation).toBe('default');
  });

  it('returns default variation when benchmark has FAILED status', () => {
    mockUseShowBenchmarkBanner.mockReturnValue({
      showBanner: true,
      isPending: false,
    });
    setupQueryMock([
      { benchmarkId: 'bm-1', provider: 'aws', status: SimplifiedRunStatus.FAILED },
    ]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.variation).toBe('default');
  });

  it('returns report variation and aws provider when aws benchmark has SUCCEEDED', () => {
    mockUseShowBenchmarkBanner.mockReturnValue({
      showBanner: true,
      isPending: false,
    });
    setupQueryMock([
      {
        benchmarkId: 'bm-1',
        provider: 'aws',
        status: SimplifiedRunStatus.SUCCEEDED,
      },
    ]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.variation).toBe('report');
    expect(result.current.providers).toEqual(['aws']);
  });

  it('returns report variation when there are multiple benchmarks and one has SUCCEEDED', () => {
    mockUseShowBenchmarkBanner.mockReturnValue({
      showBanner: true,
      isPending: false,
    });
    setupQueryMock([
      { benchmarkId: 'bm-1', provider: 'aws', status: SimplifiedRunStatus.RUNNING },
      {
        benchmarkId: 'bm-2',
        provider: 'azure',
        status: SimplifiedRunStatus.SUCCEEDED,
      },
    ]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.variation).toBe('report');
    expect(result.current.providers).toEqual(['azure']);
  });

  it('returns succeeded providers in API order', () => {
    mockUseShowBenchmarkBanner.mockReturnValue({
      showBanner: true,
      isPending: false,
    });
    setupQueryMock([
      {
        benchmarkId: 'bm-1',
        provider: 'azure',
        status: SimplifiedRunStatus.SUCCEEDED,
      },
      {
        benchmarkId: 'bm-2',
        provider: 'aws',
        status: SimplifiedRunStatus.SUCCEEDED,
      },
    ]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.variation).toBe('report');
    expect(result.current.providers).toEqual(['azure', 'aws']);
  });

  it('dedupes providers when multiple succeeded benchmarks share provider', () => {
    mockUseShowBenchmarkBanner.mockReturnValue({
      showBanner: true,
      isPending: false,
    });
    setupQueryMock([
      {
        benchmarkId: 'bm-1',
        provider: 'aws',
        status: SimplifiedRunStatus.SUCCEEDED,
      },
      {
        benchmarkId: 'bm-2',
        provider: 'aws',
        status: SimplifiedRunStatus.SUCCEEDED,
      },
      {
        benchmarkId: 'bm-3',
        provider: 'azure',
        status: SimplifiedRunStatus.SUCCEEDED,
      },
    ]);

    const { result } = renderHook(() => useBenchmarkBannerState());

    expect(result.current.variation).toBe('report');
    expect(result.current.providers).toEqual(['aws', 'azure']);
  });
});
