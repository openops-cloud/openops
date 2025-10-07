import type { Meta, StoryObj } from '@storybook/react';

import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import { CommunityBadge } from '../../components/community-badge/community-badge';
import { TooltipProvider } from '../../ui/tooltip';

const meta = {
  title: 'Components/CommunityBadge',
  component: CommunityBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    link: { control: 'text' },
    showUpgrade: { control: 'boolean' },
  },
  args: {
    link: '/upgrade',
    showUpgrade: false,
  },
  decorators: [ThemeAwareDecorator],
  render: (args) => (
    <TooltipProvider>
      <CommunityBadge {...args} />
    </TooltipProvider>
  ),
} satisfies Meta<typeof CommunityBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithUpgrade: Story = {
  args: {
    showUpgrade: true,
  },
};
