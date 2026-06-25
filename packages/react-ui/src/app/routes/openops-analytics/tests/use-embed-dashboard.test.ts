import { render, renderHook } from '@testing-library/react';
import React from 'react';

import { useEmbedDashboard } from '../use-embed-dashboard';

const mockEmbedDashboard = jest.fn();
jest.mock('@superset-ui/embedded-sdk', () => ({
  embedDashboard: (...args: unknown[]) => mockEmbedDashboard(...args),
}));

jest.mock('@/app/lib/authentication-api', () => ({
  authenticationApi: {
    fetchAnalyticsGuestToken: jest.fn().mockResolvedValue('guest-token'),
  },
}));

const baseParams = {
  analyticsPublicUrl: 'https://analytics.example.com',
  selectedDashboard: {
    embedId: 'embed-123',
    id: 'finops',
    name: 'FinOps',
    slug: 'finops',
    enabled: true,
  },
};

// Test component that attaches the ref to a real DOM node so useEffect can proceed
function TestComponent(props: Parameters<typeof useEmbedDashboard>[0]) {
  const { iframeContainerRef } = useEmbedDashboard(props);
  return React.createElement('div', { ref: iframeContainerRef });
}

describe('useEmbedDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call embedDashboard when analyticsPublicUrl is null', () => {
    renderHook(() =>
      useEmbedDashboard({ ...baseParams, analyticsPublicUrl: null }),
    );
    expect(mockEmbedDashboard).not.toHaveBeenCalled();
  });

  it('does not call embedDashboard when selectedDashboard is undefined', () => {
    renderHook(() =>
      useEmbedDashboard({ ...baseParams, selectedDashboard: undefined }),
    );
    expect(mockEmbedDashboard).not.toHaveBeenCalled();
  });

  it('does not call embedDashboard when selectedDashboard.embedId is falsy', () => {
    renderHook(() =>
      useEmbedDashboard({
        ...baseParams,
        selectedDashboard: { ...baseParams.selectedDashboard, embedId: '' },
      }),
    );
    expect(mockEmbedDashboard).not.toHaveBeenCalled();
  });

  it('calls embedDashboard with correct id and supersetDomain', () => {
    render(React.createElement(TestComponent, baseParams));

    expect(mockEmbedDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'embed-123',
        supersetDomain: 'https://analytics.example.com/openops-analytics',
      }),
    );
  });

  it('passes a fetchGuestToken function that calls authenticationApi', () => {
    render(React.createElement(TestComponent, baseParams));

    expect(mockEmbedDashboard).toHaveBeenCalledTimes(1);
    const { fetchGuestToken } = mockEmbedDashboard.mock.calls[0][0];
    expect(typeof fetchGuestToken).toBe('function');
  });
});
