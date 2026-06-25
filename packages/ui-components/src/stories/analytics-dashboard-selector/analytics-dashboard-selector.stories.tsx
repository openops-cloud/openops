import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AnalyticsDashboardSelector } from '../../components/analytics-dashboard-selector/analytics-dashboard-selector';

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
 * Displays a dashboard selector dropdown when more than one dashboard is enabled.
 * Returns null when only one or zero dashboards are enabled.
 */
const meta = {
  title: 'Components/AnalyticsDashboardSelector',
  component: AnalyticsDashboardSelector,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    chromatic: { disable: true },
  },
  args: {
    dashboards: sampleDashboards,
    selectedDashboardId: 'finops',
    onDashboardChange: fn(),
  },
} satisfies Meta<typeof AnalyticsDashboardSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Shows the selector with multiple enabled dashboards.
 */
export const Default: Story = {};

/**
 * Shows the selector with the second dashboard selected.
 */
export const SecondSelected: Story = {
  args: {
    selectedDashboardId: 'aws-benchmark',
  },
};

/**
 * Returns null when only one dashboard is enabled — the selector is hidden.
 */
export const SingleDashboard: Story = {
  args: {
    dashboards: [sampleDashboards[0]],
  },
};
