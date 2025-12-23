import type { Meta, StoryObj } from '@storybook/react';
import { BlockIcon } from '../../components';
import { TooltipProvider } from '../../ui/tooltip';

/**
 * Displays an icon with optional tooltip, circle, and border variants.
 */
const meta = {
  title: 'Components/BlockIcon',
  component: BlockIcon,
  tags: ['autodocs'],
  args: {
    displayName: 'Example Block',
    logoUrl: '/logos/logo.icon.positive.svg',
    showTooltip: true,
    size: 'md',
    circle: true,
    border: false,
  },
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      options: ['xxl', 'xl', 'lg', 'md', 'sm'],
      control: { type: 'select' },
    },
    circle: {
      control: { type: 'boolean' },
    },
    border: {
      control: { type: 'boolean' },
    },
    showTooltip: {
      control: { type: 'boolean' },
    },
  },
  render: (args) => (
    <TooltipProvider>
      <BlockIcon {...args} />
    </TooltipProvider>
  ),
} satisfies Meta<typeof BlockIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default variant of the BlockIcon component.
 */
export const Default: Story = {};

/**
 * A larger icon with a border and tooltip.
 */
export const LargeWithBorder: Story = {
  args: {
    size: 'xl',
    border: true,
    displayName: 'Larger Block',
  },
};

/**
 * A small, non-circular icon without a tooltip.
 */
export const SmallNoTooltip: Story = {
  args: {
    size: 'sm',
    circle: false,
    showTooltip: false,
    displayName: 'Small Block',
  },
};
