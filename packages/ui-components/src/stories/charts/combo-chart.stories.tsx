import type { Meta, StoryObj } from '@storybook/react';

import { ComboChart } from '@/ui/chart';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';

/**
 * A combination bar and line chart component built on top of Recharts primitives.
 * Bars are plotted against the left Y-axis, lines against the right Y-axis,
 * and both share a unified bottom X-axis.
 */
const meta: Meta<typeof ComboChart> = {
  title: 'ui/Charts/ComboChart',
  component: ComboChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    className: 'h-[227px] min-w-[770px]',
    xAxisKey: 'week',
    showXAxis: true,
    showLeftYAxis: false,
    showRightYAxis: false,
    showTooltip: true,
    showLegend: false,
    barSize: 12,
    leftYAxisTickFormatter: (value: number) => `${value}`,
    rightYAxisTickFormatter: (value: number) =>
      value === 0 ? '0' : `$${value / 1000}K`,
    bars: [
      {
        dataKey: 'savings',
        radius: 4,
      },
    ],
    lines: [
      { dataKey: 'idealBurndown', strokeWidth: 4 },
      { dataKey: 'remainingSavings', strokeWidth: 4, type: 'linear' },
      { dataKey: 'remainingRecommendations', strokeWidth: 4, type: 'linear' },
    ],
  },
  decorators: [ThemeAwareDecorator],
} satisfies Meta<typeof ComboChart>;

export default meta;

type Story = StoryObj<typeof meta>;

const defaultData = [
  {
    week: 'Week 1',
    savings: 40,
    idealBurndown: 250000,
    remainingSavings: 220000,
    remainingRecommendations: 200000,
  },
  {
    week: 'Week 2',
    savings: 80,
    idealBurndown: 214000,
    remainingSavings: 205000,
    remainingRecommendations: 185000,
  },
  {
    week: 'Week 3',
    savings: 60,
    idealBurndown: 178000,
    remainingSavings: 175000,
    remainingRecommendations: 145000,
  },
  {
    week: 'Week 4',
    savings: 120,
    idealBurndown: 143000,
    remainingSavings: 145000,
    remainingRecommendations: 160000,
  },
  {
    week: 'Week 5',
    savings: 90,
    idealBurndown: 107000,
    remainingSavings: 120000,
    remainingRecommendations: 105000,
  },
  {
    week: 'Week 6',
    savings: 50,
    idealBurndown: 71000,
    remainingSavings: 95000,
    remainingRecommendations: 75000,
  },
  {
    week: 'Week 7',
    savings: 140,
    idealBurndown: 36000,
    remainingSavings: 55000,
    remainingRecommendations: 50000,
  },
  {
    week: 'Week 8',
    savings: 100,
    idealBurndown: 0,
    remainingSavings: 30000,
    remainingRecommendations: 15000,
  },
];

const defaultConfig = {
  savings: {
    label: 'Savings',
    theme: { light: '#42e08c', dark: '#359763' },
  },
  idealBurndown: {
    label: 'Ideal Burndown',
    theme: { light: '#3b82f6', dark: '#60a5fa' },
  },
  remainingSavings: {
    label: 'Remaining Savings',
    theme: { light: '#eab308', dark: '#facc15' },
  },
  remainingRecommendations: {
    label: 'Remaining Recommendations',
    theme: { light: '#ec4899', dark: '#f472b6' },
  },
};

/**
 * A simple combo chart with one bar series (Savings) and three line series.
 */
export const Default: Story = {
  args: {
    data: defaultData,
    config: defaultConfig,
  },
};

/**
 * Combo chart with both left (bar) and right (line) Y-axes visible.
 * Axis ranges are derived from the data values.
 */
export const WithAxes: Story = {
  args: {
    data: defaultData,
    config: defaultConfig,
    showLeftYAxis: true,
    showRightYAxis: true,
  },
};

/**
 * Combo chart with the legend displayed above the chart.
 */
export const WithLegend: Story = {
  args: {
    data: defaultData,
    config: defaultConfig,
    showLegend: true,
  },
};

/**
 * Combo chart combining bars with line series, both axes, legend, and custom bar spacing.
 */
export const AllFeatures: Story = {
  args: {
    data: defaultData,
    config: defaultConfig,
    showLeftYAxis: true,
    showRightYAxis: true,
    showLegend: true,
    barCategoryGap: '55%',
    legendClassName: 'mb-[26px] justify-end mr-[50px]',
  },
};
