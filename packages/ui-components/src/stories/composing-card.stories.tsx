import type { Meta, StoryObj } from '@storybook/react';

import { ComposingCard } from '@/ui/composing-card';
import { ThemeAwareDecorator } from '../../.storybook/decorators';

/**
 * A responsive card wrapper that accepts children and supports transparent or solid background.
 */
const meta = {
  title: 'ui/ComposingCard',
  component: ComposingCard,
  tags: ['autodocs'],
  args: {
    className: 'w-96 p-6',
    transparent: false,
  },
  render: (args) => (
    <ComposingCard {...args}>
      <p className="text-sm text-foreground">Card content goes here.</p>
    </ComposingCard>
  ),
  parameters: {
    layout: 'centered',
  },
  decorators: [ThemeAwareDecorator],
} satisfies Meta<typeof ComposingCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default card with the component's solid background.
 */
export const Default: Story = {};

/**
 * Card with transparent background.
 */
export const Transparent: Story = {
  args: {
    transparent: true,
  },
};
