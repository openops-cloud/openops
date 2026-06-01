import { DasbhoardOverview } from '@/components';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';

const meta = {
  title: 'components/Dashboard',
  component: DasbhoardOverview,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DasbhoardOverview>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Showcase how to use multiple Big Number Charts together in a dashboard Overview section
 */
export const Overview: Story = {
  args: {
    openOpportunitiesCount: 10,
    unaddressedSavingsAmount: '$2.1M',
    realizedSavingsAmount: '$138.42K',
    isLoading: false,
    onOpportunitiesCtaClick: fn(),
  },
  play: async ({
    canvasElement,
    args,
  }: {
    canvasElement: HTMLElement;
    args: Story['args'];
  }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const checkOpportunitiesCtaEl = await canvas.findByRole('link', {
      name: 'Check opportunities',
    });
    await userEvent.click(checkOpportunitiesCtaEl);

    expect(args.onOpportunitiesCtaClick).toHaveBeenCalled();
  },
};

/**
 * Showcase empty state
 */
export const Empty: Story = {
  args: {
    openOpportunitiesCount: 0,
    unaddressedSavingsAmount: undefined,
    realizedSavingsAmount: undefined,
    isLoading: false,
    onOpportunitiesCtaClick: fn(),
  },
};

/**
 * Showcase empty with placeholder
 */
export const EmptyWithPlaceholder: Story = {
  args: {
    openOpportunitiesCount: 0,
    unaddressedSavingsAmount: undefined,
    unnadressedSavingsPlaceholderText:
      'Create and run workflows to discover saving opportunities.',
    realizedSavingsAmount: undefined,
    realizedSavingsPlaceholderText: 'Connect to tables to track savings.',
    isLoading: false,
    onOpportunitiesCtaClick: fn(),
  },
};
