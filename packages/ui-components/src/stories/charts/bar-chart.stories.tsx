import type { Meta, StoryObj } from '@storybook/react';

import { BarChart } from '@/ui/chart';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';

/**
 * A generic bar chart component built on top of Recharts primitives.
 * Supports multiple bars, stacking, grid, axes, tooltip, and legend.
 */
const meta: Meta<typeof BarChart> = {
  title: 'ui/Charts/BarChart',
  component: BarChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    className: 'h-[153px] min-w-[650px]',
    yAxisTickFormatter: (value) => (value ? `$${value}k` : '0'),
    xAxisKey: 'week',
    showXAxis: true,
    showYAxis: false,
    showTooltip: true,
    showLegend: false,
    bars: [
      {
        dataKey: 'savingAchieved',
        radius: 4,
      },
    ],
  },
  decorators: [ThemeAwareDecorator],
} satisfies Meta<typeof BarChart>;

export default meta;

type Story = StoryObj<typeof meta>;

const singleBarData = [
  { week: 'Week 1', savingAchieved: 100 },
  { week: 'Week 2', savingAchieved: 150 },
  { week: 'Week 3', savingAchieved: 0 },
  { week: 'Week 4', savingAchieved: 0 },
  { week: 'Week 5', savingAchieved: 0 },
  { week: 'Week 6', savingAchieved: 0 },
  { week: 'Week 7', savingAchieved: 0 },
  { week: 'Week 8', savingAchieved: 0 },
];

const singleBarConfig = {
  savingAchieved: {
    label: 'Saving Achieved',
    theme: { light: '#359763', dark: '#42e08c' },
  },
};

/**
 * A simple bar chart with a single data series.
 */
export const Default: Story = {
  args: {
    data: singleBarData,
    config: singleBarConfig,
  },
};

/**
 * Bar chart with both X and Y axes visible.
 */
export const WithAxes: Story = {
  args: {
    data: singleBarData,
    config: singleBarConfig,
    showYAxis: true,
  },
};

/**
 * Bar chart with the legend displayed above the chart.
 */
export const WithLegend: Story = {
  args: {
    data: singleBarData,
    config: singleBarConfig,
    showLegend: true,
  },
};

/**
 * Bar chart with configurable bar width and spacing between bars.
 */
export const WithCustomBarSize: Story = {
  args: {
    data: singleBarData,
    config: singleBarConfig,
    barSize: 31,
    barCategoryGap: '55%',
  },
};

const stackedBarData = [
  { week: 'Week 1', savingAchieved: 100, savingPotential: 100 },
  { week: 'Week 2', savingAchieved: 150, savingPotential: 50 },
  { week: 'Week 3', savingAchieved: 60, savingPotential: 140 },
  { week: 'Week 4', savingAchieved: 90, savingPotential: 110 },
  { week: 'Week 5', savingAchieved: 30, savingPotential: 170 },
  { week: 'Week 6', savingAchieved: 70, savingPotential: 130 },
  { week: 'Week 7', savingAchieved: 110, savingPotential: 90 },
  { week: 'Week 8', savingAchieved: 50, savingPotential: 150 },
];

const stackedBarConfig = {
  savingAchieved: {
    label: 'Actual',
    theme: { light: '#359763', dark: '#42e08c' },
  },
  savingPotential: {
    label: 'Projected',
    theme: { light: '#e5e7eb', dark: '#e5e7eb' },
  },
};

/**
 * Stacked bar chart with multiple data series sharing the same stack.
 */
export const Stacked: Story = {
  args: {
    data: stackedBarData,
    config: stackedBarConfig,
    showLegend: true,
    bars: [
      { dataKey: 'savingAchieved', radius: 0, stackId: 'a' },
      { dataKey: 'savingPotential', radius: [4, 4, 0, 0], stackId: 'a' },
    ],
  },
};

/**
 * Bar chart combining all features: stacked bars, both axes, legend, custom bar size and spacing, and bar background.
 */
export const AllFeatures: Story = {
  args: {
    data: stackedBarData,
    config: stackedBarConfig,
    showYAxis: true,
    showLegend: true,
    barSize: 31,
    barCategoryGap: '55%',
    legendClassName: 'ml-20 justify-start',
    bars: [
      { dataKey: 'savingAchieved', radius: 0, stackId: 'a' },
      { dataKey: 'savingPotential', radius: [4, 4, 0, 0], stackId: 'a' },
    ],
  },
};
