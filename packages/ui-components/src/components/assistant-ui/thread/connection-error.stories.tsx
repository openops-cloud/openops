import type { Meta, StoryObj } from '@storybook/react';
import { ConnectionError } from './connection-error';

const meta: Meta<typeof ConnectionError> = {
  title: 'Assistant UI/Thread/ConnectionError',
  component: ConnectionError,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ConnectionError>;

export const Default: Story = {
  args: {
    error:
      'Connection lost. The server stopped responding. Start a new chat or refresh your browser.',
  },
};
