import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { HelpUsImprove } from '../../components';
import { TooltipProvider } from '../../ui/tooltip';

const meta = {
  title: 'Components/HelpUsImprove',
  component: HelpUsImprove,
  tags: ['autodocs'],
  args: {
    onDismiss: action('Dismiss clicked'),
    onAccept: action('Accept clicked'),
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <TooltipProvider>
      <HelpUsImprove {...args} />
    </TooltipProvider>
  ),
} satisfies Meta<typeof HelpUsImprove>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default help us improve panel.
 */
export const Default: Story = {};

/**
 * With custom className for different styling
 */
export const CustomStyle: Story = {
  args: {
    className: 'bg-primary/10',
  },
};
