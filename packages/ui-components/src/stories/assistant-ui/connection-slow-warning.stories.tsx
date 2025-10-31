import type { Meta, StoryObj } from '@storybook/react';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import { ConnectionSlowWarning } from '../../components/assistant-ui/thread/connection-slow-warning';

const meta: Meta<typeof ConnectionSlowWarning> = {
  title: 'Assistant UI/Thread/ConnectionSlowWarning',
  component: ConnectionSlowWarning,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [ThemeAwareDecorator],
};

export default meta;
type Story = StoryObj<typeof ConnectionSlowWarning>;

export const Default: Story = {};
