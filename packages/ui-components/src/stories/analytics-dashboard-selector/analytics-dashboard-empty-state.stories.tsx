import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AnalyticsDashboardEmptyState } from '../../components/analytics-dashboard-selector/analytics-dashboard-empty-state';

const sampleDashboards = [
  {
    id: 'finops',
    name: 'FinOps',
    embedId: 'embed-finops',
    slug: 'finops',
    enabled: true,
  },
  {
    id: 'aws-benchmark',
    name: 'AWS Benchmark',
    embedId: 'embed-aws-benchmark',
    slug: 'aws-benchmark',
    enabled: true,
  },
];

/**
 * Shown when a dashboard cannot be displayed after loading completes.
 * Covers two distinct cases: no dashboards exist at all, or dashboards exist
 * but the resolved selection is broken (e.g. defaultDashboardId is invalid).
 */
const meta = {
  title: 'Components/AnalyticsDashboardEmptyState',
  component: AnalyticsDashboardEmptyState,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    chromatic: { disable: true },
  },
  args: {
    onDashboardChange: fn(),
  },
} satisfies Meta<typeof AnalyticsDashboardEmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * No dashboards exist — the selector is hidden and a plain
 * "no dashboards" message is shown.
 */
export const NoDashboards: Story = {
  args: {
    dashboards: [],
  },
};

/**
 * Dashboards are available but the selected/default dashboard ID could not be
 * resolved. The selector renders with no pre-selection so the user can pick a
 * valid dashboard.
 */
export const UnresolvableDashboard: Story = {
  args: {
    dashboards: sampleDashboards,
  },
};
