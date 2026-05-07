import type { Meta, StoryObj } from '@storybook/react-vite';

import { DonutChart } from '@/ui/chart';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';

/**
 * A donut chart component built on top of Recharts primitives.
 * Supports configurable inner/outer radius, tooltip, and legend.
 */
const meta: Meta<typeof DonutChart> = {
  title: 'ui/Charts/DonutChart',
  component: DonutChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    className: 'h-[250px] min-w-[300px]',
    innerRadius: 60,
    outerRadius: 90,
    showTooltip: true,
    showLegend: true,
  },
  decorators: [ThemeAwareDecorator],
} satisfies Meta<typeof DonutChart>;

export default meta;

type Story = StoryObj<typeof meta>;

const categoryData = [
  { name: 'compute', value: 400 },
  { name: 'storage', value: 300 },
  { name: 'network', value: 200 },
  { name: 'database', value: 100 },
];

const categoryConfig = {
  compute: {
    label: 'Compute',
    theme: { light: '#3b82f6', dark: '#60a5fa' },
  },
  storage: {
    label: 'Storage',
    theme: { light: '#10b981', dark: '#34d399' },
  },
  network: {
    label: 'Network',
    theme: { light: '#f59e0b', dark: '#fbbf24' },
  },
  database: {
    label: 'Database',
    theme: { light: '#ef4444', dark: '#f87171' },
  },
};

/**
 * A simple donut chart with a single data series.
 */
export const Default: Story = {
  args: {
    data: categoryData,
    config: categoryConfig,
  },
};

/**
 * Donut chart with a larger inner radius, creating a thinner ring.
 */
export const ThinRing: Story = {
  args: {
    data: categoryData,
    config: categoryConfig,
    innerRadius: 75,
    outerRadius: 90,
  },
};

/**
 * Donut chart with a smaller inner radius, creating a thicker ring.
 */
export const ThickRing: Story = {
  args: {
    data: categoryData,
    config: categoryConfig,
    innerRadius: 40,
    outerRadius: 90,
  },
};

/**
 * Donut chart with all category values set to zero, showing an empty state.
 */
export const EmptyState: Story = {
  args: {
    data: [
      { name: 'compute', value: 0 },
      { name: 'storage', value: 0 },
      { name: 'network', value: 0 },
      { name: 'database', value: 0 },
    ],
    config: categoryConfig,
  },
};

/**
 * Donut chart with mixed values — legend labels are hidden for zero-value slices.
 */
export const PartialEmpty: Story = {
  args: {
    data: [
      { name: 'compute', value: 400 },
      { name: 'storage', value: 0 },
      { name: 'network', value: 200 },
      { name: 'database', value: 0 },
    ],
    config: categoryConfig,
    className: 'h-[300px] min-w-[400px]',
  },
};

/**
 * Donut chart combining all features: radial legend, custom radii.
 */
export const AllFeatures: Story = {
  args: {
    data: categoryData,
    config: categoryConfig,
    showLegend: true,
    innerRadius: 60,
    outerRadius: 90,
    className: 'h-[300px] min-w-[400px]',
  },
};
