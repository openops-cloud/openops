import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { userHooks } from '@/app/common/hooks/user-hooks';
import { renderHook } from '@testing-library/react';
import { useShowBenchmarkBanner } from './useShowBenchmarkBanner';

jest.mock('@/app/common/hooks/flags-hooks', () => ({
  flagsHooks: {
    useFlag: jest.fn(),
  },
}));

jest.mock('@/app/common/hooks/user-hooks', () => ({
  userHooks: {
    useUserMeta: jest.fn(),
  },
}));

const mockUseFlag = flagsHooks.useFlag as jest.Mock;
const mockUseUserMeta = userHooks.useUserMeta as jest.Mock;

describe('useShowBenchmarkBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return showBanner false when flag is disabled', () => {
    mockUseFlag.mockReturnValue({ data: false });
    mockUseUserMeta.mockReturnValue({
      userMeta: {
        projectPermissions: {
          benchmark: true,
        },
      },
      isPending: false,
    });

    const { result } = renderHook(() => useShowBenchmarkBanner());

    expect(result.current.showBanner).toBe(false);
    expect(result.current.isPending).toBe(false);
  });

  it('should return showBanner false when user has no benchmark access', () => {
    mockUseFlag.mockReturnValue({ data: true });
    mockUseUserMeta.mockReturnValue({
      userMeta: {
        projectPermissions: {
          benchmark: false,
        },
      },
      isPending: false,
    });

    const { result } = renderHook(() => useShowBenchmarkBanner());

    expect(result.current.showBanner).toBe(false);
    expect(result.current.isPending).toBe(false);
  });

  it('should return showBanner false when userMeta is undefined', () => {
    mockUseFlag.mockReturnValue({ data: true });
    mockUseUserMeta.mockReturnValue({
      userMeta: undefined,
      isPending: false,
    });

    const { result } = renderHook(() => useShowBenchmarkBanner());

    expect(result.current.showBanner).toBe(false);
    expect(result.current.isPending).toBe(false);
  });

  it('should return showBanner true when flag is enabled and user has benchmark access', () => {
    mockUseFlag.mockReturnValue({ data: true });
    mockUseUserMeta.mockReturnValue({
      userMeta: {
        projectPermissions: {
          benchmark: true,
        },
      },
      isPending: false,
    });

    const { result } = renderHook(() => useShowBenchmarkBanner());

    expect(result.current.showBanner).toBe(true);
    expect(result.current.isPending).toBe(false);
  });

  it('should handle isPending from userMeta', () => {
    mockUseFlag.mockReturnValue({ data: true });
    mockUseUserMeta.mockReturnValue({
      userMeta: undefined,
      isPending: true,
    });

    const { result } = renderHook(() => useShowBenchmarkBanner());

    expect(result.current.showBanner).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it('should handle undefined flag value', () => {
    mockUseFlag.mockReturnValue({ data: undefined });
    mockUseUserMeta.mockReturnValue({
      userMeta: {
        projectPermissions: {
          benchmark: true,
        },
      },
      isPending: false,
    });

    const { result } = renderHook(() => useShowBenchmarkBanner());

    expect(result.current.showBanner).toBe(false);
  });
});
