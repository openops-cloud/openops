import { act, renderHook } from '@testing-library/react';

import { useAnalyticsDashboard } from '../use-analytics-dashboard';

const mockSetSearchParams = jest.fn();
jest.mock('react-router-dom', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/app/common/hooks/flags-hooks', () => ({
  flagsHooks: {
    useFlag: jest.fn(),
  },
}));

import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';

const mockUseSearchParams = useSearchParams as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;
const mockUseFlag = flagsHooks.useFlag as jest.Mock;

const makeRegistry = (overrides = {}) => ({
  defaultDashboardId: 'finops',
  dashboards: [
    { id: 'finops', name: 'FinOps', embedId: 'embed-finops', slug: 'finops', enabled: true },
    { id: 'benchmark', name: 'Benchmark', embedId: 'embed-benchmark', slug: 'benchmark', enabled: true },
  ],
  ...overrides,
});

function setup(searchParam: string | null = null, registryData: unknown = undefined) {
  mockUseSearchParams.mockReturnValue([
    new URLSearchParams(searchParam ? `dashboard=${searchParam}` : ''),
    mockSetSearchParams,
  ]);
  mockUseFlag.mockReturnValue({ data: registryData });
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });

  return renderHook(() => useAnalyticsDashboard());
}

describe('useAnalyticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('isLoading is true when dashboardRegistry is undefined', () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), mockSetSearchParams]);
    mockUseFlag.mockReturnValue({ data: undefined });
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });

    const { result } = renderHook(() => useAnalyticsDashboard());

    expect(result.current.isLoading).toBe(true);
  });

  it('returns fallback dashboard when registry is null and fallbackEmbedId is available', () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), mockSetSearchParams]);
    mockUseFlag.mockReturnValue({ data: null });
    mockUseQuery.mockReturnValue({ data: 'embed-fallback', isLoading: false });

    const { result } = renderHook(() => useAnalyticsDashboard());

    expect(result.current.selectedDashboard).toMatchObject({
      embedId: 'embed-fallback',
      name: 'FinOps',
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('returns undefined selectedDashboard when registry is null and fallback is loading', () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), mockSetSearchParams]);
    mockUseFlag.mockReturnValue({ data: null });
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useAnalyticsDashboard());

    expect(result.current.selectedDashboard).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('selects dashboard matching the URL ?dashboard= param', async () => {
    const { result } = setup('benchmark', makeRegistry());

    await act(async () => {});

    expect(result.current.selectedDashboard?.id).toBe('benchmark');
  });

  it('falls back to defaultDashboardId when URL param does not match any dashboard', async () => {
    const { result } = setup('nonexistent', makeRegistry({ defaultDashboardId: 'benchmark' }));

    await act(async () => {});

    expect(result.current.selectedDashboard?.id).toBe('benchmark');
  });

  it('falls back to the first enabled dashboard when neither URL param nor defaultDashboardId match', async () => {
    const { result } = setup(
      'nonexistent',
      makeRegistry({ defaultDashboardId: 'also-nonexistent' }),
    );

    await act(async () => {});

    expect(result.current.selectedDashboard?.id).toBe('finops');
  });

  it('handleDashboardChange updates selectedDashboardId and calls setSearchParams', async () => {
    const { result } = setup(null, makeRegistry());

    await act(async () => {
      result.current.handleDashboardChange('benchmark');
    });

    expect(result.current.selectedDashboardId).toBe('benchmark');
    expect(mockSetSearchParams).toHaveBeenCalledWith({ dashboard: 'benchmark' });
  });
});
