import type { Meta, StoryObj } from '@storybook/react';

import { AnalyticsLoadingSpinner } from '@/ui/analytics-loading-spinner';

/**
 * A spinner used as the loading state for the Analytics (Superset) iframe.
 * Mimics Superset's own loading indicator: a gray ring with a short blue arc and rounded caps.
 */
const meta = {
  title: 'ui/AnalyticsLoadingSpinner',
  component: AnalyticsLoadingSpinner,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    chromatic: { disable: true },
  },
} satisfies Meta<typeof AnalyticsLoadingSpinner>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default spinner shown while the analytics view is loading.
 */
export const Default: Story = {};
