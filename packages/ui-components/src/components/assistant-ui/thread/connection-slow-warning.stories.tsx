import type { Meta, StoryObj } from '@storybook/react';
import { ConnectionSlowWarning } from './connection-slow-warning';

const meta: Meta<typeof ConnectionSlowWarning> = {
  title: 'Assistant UI/Thread/ConnectionSlowWarning',
  component: ConnectionSlowWarning,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ConnectionSlowWarning>;

export const Default: Story = {};
