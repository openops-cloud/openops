import { BigNumberChart } from '@/ui/big-number-chart';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';

const meta = {
  title: 'ui/Dashboard/charts/Big Number Chart',
  component: BigNumberChart,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof BigNumberChart>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * It renders the label on first row and and the value of the chart on the second row
 */
export const Minimal: Story = {
  args: {
    label: 'Unaddressed savings',
    value: '$2.1M',
    placeholderText: 'Create and run flows to discover saving opportunities',
  },
};

/**
 * It renders a label on firt row, the value of the chart on the second row, and a cta link on the third row
 */
export const WithCta: Story = {
  args: {
    label: 'Open opportunities',
    value: '904',
    ctaText: 'Check opportunities',
    onCtaClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    (await canvas.findByRole('link')).click();

    await waitFor(() => expect(args.onCtaClick).toHaveBeenCalled());
  },
};

/**
 * It renders a label on firt row, the value of the chart on the second row, and a footer text on the third row
 */
export const WithFooterText: Story = {
  args: {
    label: 'Realized savings',
    value: '$138.42K',
    footerText: 'Last 30 days',
    placeholderText: 'Run your workflow to start saving money.',
  },
};

/**
 * It renders label and empty value followed by a placeholder text
 */
export const Empty: Story = {
  args: {
    ...Minimal.args,
    value: undefined,
  },
};

/**
 * It renders label followed by a Skeleton loader
 */
export const Loading: Story = {
  args: {
    ...Minimal.args,
    isLoading: true,
  },
};
